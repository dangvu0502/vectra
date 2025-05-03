import type { Request, Response } from 'express';
import type { CollectionService } from '@/modules/collections/collections.service';
import type { FileService } from '@/modules/file/file.service';
import type { EmbeddingService } from '@/modules/file/file.embedding.service';
import {
  createCollectionSchema,
  updateCollectionSchema,
  addFileToCollectionSchema,
  knowledgeQuerySchema,
  uuidParamSchema,
  collectionFileParamsSchema,
} from './vectra-api.validation';
import type {
  FileResponse,
  FileListResponseItem,
  KnowledgeQueryResponse,
} from './vectra-api.types';
import { AppError, FileNotFoundError, CollectionNotFoundError, ForbiddenError, CollectionConflictError } from '@/shared/errors'; // Import necessary errors

// Helper function to handle errors consistently
function handleError(res: Response, error: unknown, defaultMessage: string = 'An unexpected error occurred.') {
  console.error('API Controller Error:', error); // Log the actual error

  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: error.message });
  } else if (error instanceof FileNotFoundError || error instanceof CollectionNotFoundError) {
    res.status(404).json({ error: error.message });
  } else if (error instanceof ForbiddenError) {
    res.status(403).json({ error: error.message });
  } else if (error instanceof CollectionConflictError) {
    res.status(409).json({ error: error.message });
  } else if (error instanceof Error) {
    // Handle Zod validation errors or other generic errors
    res.status(400).json({ error: error.message });
  }
   else {
    res.status(500).json({ error: defaultMessage });
  }
}

// Helper to format file response, omitting sensitive fields
function formatFileResponse(file: any): FileResponse {
  const { content, path, user_id, ...rest } = file;
  return rest;
}

// Helper to format file list response
function formatFileListResponse(files: any[]): FileListResponseItem[] {
    return files.map(file => {
        const { content, path, user_id, metadata, ...rest } = file;
        // Selectively include metadata fields for list view
        const listMetadata = {
            originalSize: metadata?.originalSize,
            mimeType: metadata?.mimeType,
            embeddingsCreated: metadata?.embeddingsCreated,
        };
        return { ...rest, metadata: listMetadata };
    });
}


export class VectraApiController {
  constructor(
    private readonly collectionService: CollectionService,
    private readonly fileService: FileService,
    private readonly embeddingService: EmbeddingService
  ) {}

  // --- Collection Methods ---

  async createCollection(req: Request, res: Response): Promise<void> {
    try {
      const input = createCollectionSchema.parse(req.body);
      const userId = req.apiKeyUser!.userId;
      const collection = await this.collectionService.createCollection(userId, input);
      res.status(201).json(collection);
    } catch (error) {
      handleError(res, error, 'Failed to create collection.');
    }
  }

  async listCollections(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.apiKeyUser!.userId;
      const collections = await this.collectionService.getUserCollections(userId);
      res.status(200).json(collections);
    } catch (error) {
      handleError(res, error, 'Failed to list collections.');
    }
  }

  async getCollection(req: Request, res: Response): Promise<void> {
    try {
      const { id: collectionId } = uuidParamSchema.parse(req.params);
      const userId = req.apiKeyUser!.userId;
      const collection = await this.collectionService.getCollectionById(collectionId, userId);
      res.status(200).json(collection);
    } catch (error) {
      handleError(res, error, 'Failed to get collection details.');
    }
  }

  async updateCollection(req: Request, res: Response): Promise<void> {
    try {
      const { id: collectionId } = uuidParamSchema.parse(req.params);
      const input = updateCollectionSchema.parse(req.body);
      const userId = req.apiKeyUser!.userId;
      const updatedCollection = await this.collectionService.updateCollection(collectionId, userId, input);
      res.status(200).json(updatedCollection);
    } catch (error) {
      handleError(res, error, 'Failed to update collection.');
    }
  }

  async deleteCollection(req: Request, res: Response): Promise<void> {
    try {
      const { id: collectionId } = uuidParamSchema.parse(req.params);
      const userId = req.apiKeyUser!.userId;
      await this.collectionService.deleteCollection(collectionId, userId);
      res.status(204).send();
    } catch (error) {
      handleError(res, error, 'Failed to delete collection.');
    }
  }

  // --- File Methods ---

  async uploadFile(req: Request, res: Response): Promise<void> {
     if (!req.file) {
       return handleError(res, new AppError('No file uploaded.', 400));
     }
     try {
       const userId = req.apiKeyUser!.userId;
       const collectionId = req.body.collectionId as string | undefined;

       // TODO: Read file content securely if needed by service, or rely on service to read from path
       const content = ""; // Placeholder

       const dbFile = await this.fileService.upload({
         file: req.file,
         content: content,
         collectionId: collectionId,
         userId: userId,
       });

       res.status(201).json(formatFileResponse(dbFile));
     } catch (error) {
       // Cleanup uploaded file if service fails? Service might handle this.
       handleError(res, error, 'Failed to upload file.');
     }
  }

  async listFiles(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.apiKeyUser!.userId;
      // TODO: Add pagination/filtering options from query params if needed
      const { files } = await this.fileService.query(userId, {});
      res.status(200).json(formatFileListResponse(files));
    } catch (error) {
      handleError(res, error, 'Failed to list files.');
    }
  }

  async getFile(req: Request, res: Response): Promise<void> {
    try {
      const { id: fileId } = uuidParamSchema.parse(req.params);
      const userId = req.apiKeyUser!.userId;
      const file = await this.fileService.findById(userId, fileId);
      if (!file) {
        throw new FileNotFoundError(fileId);
      }
      res.status(200).json(formatFileResponse(file));
    } catch (error) {
      handleError(res, error, 'Failed to get file details.');
    }
  }

  async deleteFile(req: Request, res: Response): Promise<void> {
    try {
      const { id: fileId } = uuidParamSchema.parse(req.params);
      const userId = req.apiKeyUser!.userId;
      await this.fileService.delete(userId, fileId);
      res.status(204).send();
    } catch (error) {
      handleError(res, error, 'Failed to delete file.');
    }
  }

  // --- Linking Methods ---

  async addFileToCollection(req: Request, res: Response): Promise<void> {
    try {
      const { collectionId } = collectionFileParamsSchema.parse(req.params);
      const { fileId } = addFileToCollectionSchema.parse(req.body);
      const userId = req.apiKeyUser!.userId;
      await this.collectionService.addFileToCollection(userId, collectionId, fileId);
      res.status(200).json({ message: 'File added to collection successfully.' });
    } catch (error) {
      handleError(res, error, 'Failed to add file to collection.');
    }
  }

  async removeFileFromCollection(req: Request, res: Response): Promise<void> {
    try {
      const { collectionId, fileId } = collectionFileParamsSchema.parse(req.params);
      const userId = req.apiKeyUser!.userId;
      await this.collectionService.removeFileFromCollection(userId, collectionId, fileId);
      res.status(200).json({ message: 'File removed from collection successfully.' }); // 200 or 204? 200 indicates success message.
    } catch (error) {
      handleError(res, error, 'Failed to remove file from collection.');
    }
  }

  async listFilesInCollection(req: Request, res: Response): Promise<void> {
    try {
      const { id: collectionId } = uuidParamSchema.parse(req.params);
      const userId = req.apiKeyUser!.userId;
      const collectionWithFiles = await this.collectionService.getFilesInCollection(userId, collectionId);
      // TODO: Files within this response might need formatting similar to listFiles
      res.status(200).json(collectionWithFiles);
    } catch (error) {
      handleError(res, error, 'Failed to list files in collection.');
    }
  }

  // --- Knowledge Query Method ---

  async queryKnowledge(req: Request, res: Response): Promise<void> {
    try {
      const input = knowledgeQuerySchema.parse(req.body);
      const userId = req.apiKeyUser!.userId;

      const results = await this.embeddingService.queryEmbeddings({
        userId: userId,
        queryText: input.queryText,
        limit: input.limit ?? 10,
        collectionId: input.collectionId,
        searchMode: input.searchMode,
        includeMetadataFilters: input.includeMetadataFilters,
        excludeMetadataFilters: input.excludeMetadataFilters,
        maxDistance: input.maxDistance,
        enableGraphSearch: input.enableGraphSearch,
        graphDepth: input.graphDepth,
        graphRelationshipTypes: input.graphRelationshipTypes,
        graphTraversalDirection: input.graphTraversalDirection,
      });

      // Type assertion might be needed if the return type from service isn't exactly KnowledgeQueryResponse
      res.status(200).json(results as KnowledgeQueryResponse);
    } catch (error) {
      handleError(res, error, 'Failed to query knowledge.');
    }
  }
}
