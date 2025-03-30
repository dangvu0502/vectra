import type { Request, Response } from 'express';
import fs from 'fs/promises';
import { z } from 'zod';
import { DocumentNotFoundError } from '@/modules/core/errors';
// Import service interface and instance
import type { IDocumentService } from './document.service';
import { documentService } from './document.service';
// Import Zod schemas and derived types from model.ts
import { documentSchema, querySchema, type Document as DbDocumentType } from './document.model';


class DocumentController { // Keep class definition
  private static instance: DocumentController | null = null; // Keep static instance
  private readonly documentService: IDocumentService;

  private constructor(documentService: IDocumentService) { // Keep constructor private
    this.documentService = documentService;
  }

  // Keep static getInstance method
  static getInstance(documentService: IDocumentService): DocumentController {
    if (!DocumentController.instance) {
      DocumentController.instance = new DocumentController(documentService);
    }
    return DocumentController.instance;
  }

  // Keep static resetInstance method (optional)
  static resetInstance(): void {
    DocumentController.instance = null;
  }

  async upload(req: Request & { file?: Express.Multer.File }, res: Response) {
    try {
      if (!req.file) {
        return void res.status(400).json({ message: 'No file uploaded' });
      }

      const content = await fs.readFile(req.file.path, 'utf-8');
      // Service method now returns validated DbDocumentType
      const doc: DbDocumentType = await this.documentService.upload({
        file: req.file,
        content,
        collectionId: req.body?.collection_id
      });
      // Validation here is likely redundant as the service should return validated data
      // const validatedDoc = documentSchema.parse(doc);

      // Check metadata for embedding status - Note: this reflects status *at time of DB record creation/update*
      // The async embedding process might still be running or fail later.
      const embeddingStatus = doc.metadata?.embeddingsCreated
        ? { embeddingStatus: 'success', embeddingTimestamp: doc.metadata.embeddingsTimestamp }
        : doc.metadata?.embeddingError
          ? { embeddingStatus: 'error', embeddingError: doc.metadata.embeddingError }
          : { embeddingStatus: 'pending' }; // Indicate pending if not success/error yet

      res.status(201).json({
        status: 'success',
        data: {
          ...doc, // Use the validated doc from the service
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
      // Validate query parameters first
      const validatedQuery = querySchema.parse(req.query);
      // Service method returns validated documents and total
      const result = await this.documentService.query(validatedQuery);
      // Validation here is redundant as the service guarantees validated output based on its return type
      // const validatedDocs = z.array(documentSchema).parse(result.documents);
      console.log('Documents found:', result.documents.length);
      res.json({
        status: 'success',
        data: { documents: result.documents, total: result.total } // Use result directly
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
      // Service method returns validated DbDocumentType or null
      const doc = await this.documentService.findById(req.params.id);
      if (!doc) {
        return void res.status(404).json({ message: `Document with id "${req.params.id}" not found` });
      }
      // Validation here is redundant
      // const validatedDoc = documentSchema.parse(doc);
      res.json({ data: doc }); // Use doc directly
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
      // Validate the ID parameter from the request
      const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
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

// Keep instance export
export const documentController = DocumentController.getInstance(documentService);
