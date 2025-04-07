import type { Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import { z } from 'zod';
import { FileNotFoundError, ForbiddenError } from '@/shared/errors'; // Import ForbiddenError
import type { IFileService } from './file.service';
import { fileService } from './file.service';
// Import the new schema
import { fileSchema, querySchema, ingestUrlSchema, type File as DbFileType } from './file.schema';
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

  // POST /files - Upload a new file
  async upload(req: Request & { file?: Express.Multer.File }, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        // Use return void for consistency in error responses
        return void res.status(400).json({ message: 'No file uploaded' });
      }

      const content = await fs.readFile(req.file.path, 'utf-8');
      const user = req.user as UserProfile; // Assuming auth middleware adds user

      // Pass collectionId if provided in the body (for initial assignment during upload)
      const file: DbFileType = await this.fileService.upload({
        file: req.file,
        content,
        collectionId: req.body?.collection_id, // This field is now ignored by the service due to schema change
        userId: user.id // Use authenticated user ID
      });

      // Determine embedding status based on metadata
      const embeddingStatus = file.metadata?.embeddingsCreated
        ? { embeddingStatus: 'success', embeddingTimestamp: file.metadata.embeddingsTimestamp }
        : file.metadata?.embeddingError
          ? { embeddingStatus: 'error', embeddingError: file.metadata.embeddingError }
          : { embeddingStatus: 'pending' };

      res.status(201).json({
        status: 'success',
        data: {
          ...file,
          embedding: embeddingStatus
        }
      });
    } catch (error) {
      // Pass errors to the central error handler
      next(error);
    }
  }

  // POST /files/ingest-url - Ingest content from a URL
  async ingestUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedBody = ingestUrlSchema.parse(req.body);
      const user = req.user as UserProfile; // Assuming auth middleware adds user

      const file: DbFileType = await this.fileService.ingestUrl({
        url: validatedBody.url,
        collectionId: validatedBody.collectionId,
        userId: user.id // Use authenticated user ID
      });

      // Determine embedding status (similar to upload)
      const embeddingStatus = file.metadata?.embeddingsCreated
        ? { embeddingStatus: 'success', embeddingTimestamp: file.metadata.embeddingsTimestamp }
        : file.metadata?.embeddingError
          ? { embeddingStatus: 'error', embeddingError: file.metadata.embeddingError }
          : { embeddingStatus: 'pending' };

      res.status(201).json({ // 201 Created status
        status: 'success',
        data: {
          ...file,
          embedding: embeddingStatus
        }
      });
    } catch (error) {
      // Handle Zod validation errors specifically
      if (error instanceof z.ZodError) {
        return void res.status(400).json({ message: 'Invalid request body', errors: error.errors });
      }
      // Pass other errors to the central error handler
      next(error);
    }
  }

  // GET /files - Query files with pagination/search
  async query(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedQuery = querySchema.parse(req.query);
      const result = await this.fileService.query(validatedQuery);
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
      const file = await this.fileService.findById(id);
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
      // TODO: Add user ownership check here before deleting
      await this.fileService.delete(id);
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
