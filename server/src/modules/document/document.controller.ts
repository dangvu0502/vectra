import type { Request, Response } from 'express';
import fs from 'fs/promises';
import { z } from 'zod';
import { DocumentNotFoundError } from '@/modules/core/errors';
// Removed duplicate imports
import type { IDocumentService } from './document.service';
import { documentSchema, querySchema } from './document.model';
import { documentService } from './document.service'; // Import the service instance

class DocumentController { // Removed export
  private static instance: DocumentController | null = null; // Added back static instance
  private readonly documentService: IDocumentService;

  private constructor(documentService: IDocumentService) { // Made constructor private
    this.documentService = documentService;
  }

  // Added back static getInstance method
  static getInstance(documentService: IDocumentService): DocumentController {
    if (!DocumentController.instance) {
      DocumentController.instance = new DocumentController(documentService);
    }
    return DocumentController.instance;
  }

  // Added back static resetInstance method (optional)
  static resetInstance(): void {
    DocumentController.instance = null;
  }

  async upload(req: Request & { file?: Express.Multer.File }, res: Response) {
    try {
      if (!req.file) {
        return void res.status(400).json({ message: 'No file uploaded' });
      }

      const content = await fs.readFile(req.file.path, 'utf-8');
      const doc = await this.documentService.upload(req.file, content);
      // const validatedDoc = documentSchema.parse(doc);

      const embeddingStatus = doc.metadata?.embeddingsCreated
        ? { embeddingStatus: 'success', embeddingTimestamp: doc.metadata.embeddingsTimestamp }
        : doc.metadata?.embeddingError
          ? { embeddingStatus: 'error', embeddingError: doc.metadata.embeddingError }
          : { embeddingStatus: 'unknown' };

      res.status(201).json({
        status: 'success',
        data: {
          ...doc,
          embedding: embeddingStatus
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return void res.status(400).json({ message: 'Invalid document data', errors: error.errors });
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
      const validated = querySchema.parse(req.query);
      const result = await this.documentService.query(validated);
      const validatedDocs = z.array(documentSchema).parse(result.documents);
      console.log('Validated docs:', validatedDocs.length);
      res.json({
        status: 'success',
        data: { documents: validatedDocs, total: result.total }
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
      const doc = await this.documentService.findById(req.params.id);
      if (!doc) {
        return void res.status(404).json({ message: `Document with id "${req.params.id}" not found` });
      }
      const validatedDoc = documentSchema.parse(doc);
      res.json({ data: validatedDoc });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return void res.status(400).json({ message: 'Invalid document ID', errors: error.errors });
      }
      if (error instanceof Error) {
        return void res.status(500).json({ message: error.message });
      }
      res.status(500).json({ message: 'Find failed' });
    }
  }

  async delete(req: Request<{ id: string }>, res: Response) {
    try {
      const { id } = documentSchema.pick({ id: true }).parse(req.params);
      await this.documentService.delete(id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return void res.status(400).json({ message: 'Invalid document ID', errors: error.errors });
      }
      if (error instanceof DocumentNotFoundError) {
        return void res.status(404).json({ message: error.message });
      }
      if (error instanceof Error) {
        return void res.status(500).json({ message: error.message });
      }
      res.status(500).json({ message: 'Delete failed' });
    }
  }
}

// Added back instance export, initialized using getInstance and imported dependency
export const documentController = DocumentController.getInstance(documentService);
