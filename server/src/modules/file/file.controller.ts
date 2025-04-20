import type { Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import { z } from 'zod';
import { FileNotFoundError, ForbiddenError } from '@/shared/errors'; // Import ForbiddenError
import type { IFileService } from './file.service';
import {fileService } from './file.service';
// Removed ingestUrlSchema from import
import { fileSchema, querySchema, type File as DbFileType } from './file.schema';
import { v4 as uuidv4 } from 'uuid';
import { TEST_USER_ID } from '@/database/constants'; // Assuming TEST_USER_ID is still used for auth placeholder
import type { UserProfile } from '@/modules/auth/auth.types';

// Zod schema for ID parameter validation
const IdParamSchema = z.object({
  id: z.string().uuid("Invalid File ID format"),
});

class FileController {
  private static instance: FileController | null = null;
  private readonly fileService: IFileService;

  private constructor(fileService: IFileService) {
    this.fileService = fileService;
  }

  static getInstance(fileService: IFileService): FileController {
    if (!FileController.instance) {
      FileController.instance = new FileController(fileService);
    }
    return FileController.instance;
  }

  static resetInstance(): void {
    FileController.instance = null;
  }

  // POST /files/upload - Upload multiple files
  async uploadBulk(req: Request, res: Response, next: NextFunction) { // Revert req type in signature
    try {
      const user = req.user as UserProfile; // Assuming auth middleware adds user
      // Explicitly cast req.files to the expected type inside the method
      const files = req.files as Express.Multer.File[] | undefined;

      if (!files || !Array.isArray(files) || files.length === 0) {
        return void res.status(400).json({ message: 'No files uploaded' });
      }

      const uploadedFilesInfo: DbFileType[] = [];
      const errors: { fileName: string; error: string }[] = [];

      for (const file of files) { // Use the casted 'files' variable
        try {
          const content = await fs.readFile(file.path, 'utf-8');
          const createdFile: DbFileType = await this.fileService.upload({
            file: file,
            content,
            collectionId: req.body?.collection_id, // Optional: Assign to collection during bulk upload
            userId: user.id
          });
          uploadedFilesInfo.push(createdFile);
        } catch (uploadError: any) {
          errors.push({ fileName: file.originalname, error: uploadError.message || 'Failed to process file' });
          // Optionally delete the temp file if processing failed
          await fs.unlink(file.path).catch(console.error); // Clean up temp file on error
        } finally {
           // Ensure temp file is deleted even if service call succeeds but something else fails later
           // Or rely on multer's cleanup if configured
           // Check if file path exists before unlinking, as it might have been unlinked in the catch block already
           try {
             await fs.access(file.path); // Check if file exists
             await fs.unlink(file.path); // Unlink if it exists
           } catch (unlinkError: any) {
             // Ignore error if file doesn't exist (already unlinked), log others
             if (unlinkError.code !== 'ENOENT') {
                console.error(`Failed to clean up temp file ${file.path}:`, unlinkError);
             }
           }
        }
      }

      // Determine response based on success/failure mix
      if (errors.length === files.length) { // Use casted 'files' variable
        // All files failed
        return void res.status(400).json({
          status: 'error',
          message: 'All files failed to upload.',
          errors: errors
        });
      } else if (errors.length > 0) {
        // Partial success
        return void res.status(207).json({ // 207 Multi-Status
          status: 'partial_success',
          message: 'Some files were uploaded successfully, others failed.',
          data: uploadedFilesInfo.map(file => ({
            ...file,
            embedding: file.metadata?.embeddingsCreated
              ? { embeddingStatus: 'success', embeddingTimestamp: file.metadata.embeddingsTimestamp }
              : file.metadata?.embeddingError
                ? { embeddingStatus: 'error', embeddingError: file.metadata.embeddingError }
                : { embeddingStatus: 'pending' }
          })),
          errors: errors
        });
      } else {
        // All files succeeded
        res.status(201).json({
          status: 'success',
          message: 'All files uploaded successfully.',
          data: uploadedFilesInfo.map(file => ({
            ...file,
            embedding: file.metadata?.embeddingsCreated
              ? { embeddingStatus: 'success', embeddingTimestamp: file.metadata.embeddingsTimestamp }
              : file.metadata?.embeddingError
                ? { embeddingStatus: 'error', embeddingError: file.metadata.embeddingError }
                : { embeddingStatus: 'pending' }
          }))
        });
      }

    } catch (error) {
      next(error); // Pass unexpected errors to the central handler
    }
  }

  // Removed ingestUrl method

  // GET /files - Query files with pagination/search
  async query(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as UserProfile;
      const validatedQuery = querySchema.parse(req.query);
      const result = await this.fileService.query(user.id, validatedQuery);
      res.json({
        status: 'success',
        data: { files: result.files, total: result.total }
      });
    } catch (error) {
      next(error); // Pass errors to the central error handler
    }
  }

  // GET /files/:id - Get a single file by ID
  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = IdParamSchema.parse(req.params); // Validate ID format
      const user = req.user as UserProfile;
      const file = await this.fileService.findById(user.id, id);
      if (!file) {
        throw new FileNotFoundError(id); // Throw specific error
      }
      res.json({ data: file });
    } catch (error) {
      next(error); // Pass errors to the central error handler
    }
  }

  // DELETE /files/:id - Delete a file by ID
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = IdParamSchema.parse(req.params); // Validate ID format
      const user = req.user as UserProfile;
      await this.fileService.delete(user.id, id);
      res.status(204).send(); // No content on success
    } catch (error) {
      next(error); // Pass errors to the central error handler
    }
  }

  // Removed methods related to collection file linking:
  // - addFileToCollection
  // - removeFileFromCollection
  // - getFilesInCollection
  // These are now handled by collectionsController

  // GET /files/:id/collections - Get collections associated with a file
  async getCollectionsForFile(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: fileId } = IdParamSchema.parse(req.params); // Validate file ID
      const user = req.user as UserProfile; // Assuming auth middleware adds user

      // TODO: Import Collection type and use it instead of any[] in service/query
      const collections = await this.fileService.getCollectionsForFile(fileId, user.id);

      res.status(200).json({
        status: 'success',
        data: { collections } // Return the list of collections
      });
    } catch (error) {
      // Handle specific errors like FileNotFoundError or ForbiddenError if needed
      if (error instanceof z.ZodError) {
        return void res.status(400).json({ message: 'Invalid file ID', errors: error.errors });
      }
      if (error instanceof FileNotFoundError) {
         return void res.status(404).json({ message: error.message });
      }
       if (error instanceof ForbiddenError) { // Now ForbiddenError is recognized
         return void res.status(403).json({ message: error.message });
       }
      next(error); // Pass other errors (including unknown) to the central error handler
    }
  }
}

export const fileController = FileController.getInstance(fileService);
