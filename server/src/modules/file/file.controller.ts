import type { Request, Response } from 'express';
import fs from 'fs/promises';
import { z } from 'zod';
import { DocumentNotFoundError as FileNotFoundError } from '@/modules/core/errors';
// Import service interface and instance
import type { IFileService } from './file.service';
import { fileService } from './file.service';
// Import Zod schemas and derived types from model.ts
import { fileSchema, querySchema, type File as DbFileType } from './file.model';
import { v4 as uuidv4 } from 'uuid';
import { TEST_USER_ID } from '@/database/constants';

class FileController { // Keep class definition
  private static instance: FileController | null = null; // Keep static instance
  private readonly fileService: IFileService;

  private constructor(fileService: IFileService) { // Keep constructor private
    this.fileService = fileService;
  }

  // Keep static getInstance method
  static getInstance(fileService: IFileService): FileController {
    if (!FileController.instance) {
      FileController.instance = new FileController(fileService);
    }
    return FileController.instance;
  }

  // Keep static resetInstance method (optional)
  static resetInstance(): void {
    FileController.instance = null;
  }

  async upload(req: Request & { file?: Express.Multer.File }, res: Response) {
    try {
      if (!req.file) {
        return void res.status(400).json({ message: 'No file uploaded' });
      }

      const content = await fs.readFile(req.file.path, 'utf-8');
      // Service method now returns validated DbFileType
      const file: DbFileType = await this.fileService.upload({
        file: req.file,
        content,
        collectionId: req.body?.collection_id,
        userId: TEST_USER_ID
      });
      // Validation here is likely redundant as the service should return validated data
      // const validatedFile = fileSchema.parse(file);

      // Check metadata for embedding status - Note: this reflects status *at time of DB record creation/update*
      // The async embedding process might still be running or fail later.
      const embeddingStatus = file.metadata?.embeddingsCreated
        ? { embeddingStatus: 'success', embeddingTimestamp: file.metadata.embeddingsTimestamp }
        : file.metadata?.embeddingError
          ? { embeddingStatus: 'error', embeddingError: file.metadata.embeddingError }
          : { embeddingStatus: 'pending' }; // Indicate pending if not success/error yet

      res.status(201).json({
        status: 'success',
        data: {
          ...file, // Use the validated file from the service
          embedding: embeddingStatus
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return void res.status(400).json({ message: 'Invalid file data', errors: error.errors });
      }
      if (error instanceof Error) {
        return void res.status(500).json({ message: error.message });
      }
      res.status(500).json({ message: 'Upload failed' });
    }
  }

  async query(req: Request, res: Response) {
    try {
      console.log('Query params:', req.query);
      // Validate query parameters first
      const validatedQuery = querySchema.parse(req.query);
      // Service method returns validated files and total
      const result = await this.fileService.query(validatedQuery);
      // Validation here is redundant as the service guarantees validated output based on its return type
      // const validatedFiles = z.array(fileSchema).parse(result.files);
      console.log('Files found:', result.files.length);
      res.json({
        status: 'success',
        data: { files: result.files, total: result.total } // Use result directly
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return void res.status(400).json({ message: 'Invalid query parameters', errors: error.errors });
      }
      if (error instanceof Error) {
        return void res.status(500).json({ message: error.message });
      }
      res.status(500).json({ message: 'Query failed' });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      // Service method returns validated DbFileType or null
      const file = await this.fileService.findById(req.params.id);
      if (!file) {
        return void res.status(404).json({ message: `File with id "${req.params.id}" not found` });
      }
      // Validation here is redundant
      // const validatedFile = fileSchema.parse(file);
      res.json({ data: file }); // Use file directly
    } catch (error) {
      if (error instanceof z.ZodError) {
        return void res.status(400).json({ message: 'Invalid file ID', errors: error.errors });
      }
      if (error instanceof Error) {
        return void res.status(500).json({ message: error.message });
      }
      res.status(500).json({ message: 'Find failed' });
    }
  }

  async delete(req: Request<{ id: string }>, res: Response) {
    try {
      // Validate the ID parameter from the request
      const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
      await this.fileService.delete(id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return void res.status(400).json({ message: 'Invalid file ID', errors: error.errors });
      }
      if (error instanceof FileNotFoundError) {
        return void res.status(404).json({ message: error.message });
      }
      if (error instanceof Error) {
        return void res.status(500).json({ message: error.message });
      }
      res.status(500).json({ message: 'Delete failed' });
    }
  }
}
// Keep instance export
export const fileController = FileController.getInstance(fileService);
