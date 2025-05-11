import type { Request, Response } from 'express';
import fs from 'fs'; // Import fs for readFile
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
  collectionIdOnlyParamSchema, // Added import
} from './vectra-api.validation';
import type {
  FileResponse,
  FileListResponseItem,
  KnowledgeQueryResponse,
} from './vectra-api.types';
import { AppError, FileNotFoundError, CollectionNotFoundError, ForbiddenError, CollectionConflictError } from '@/shared/errors';

function handleError(res: Response, error: unknown, defaultMessage: string = 'An unexpected error occurred.') {
  console.error('API Controller Error:', error);

  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: error.message });
  } else if (error instanceof FileNotFoundError || error instanceof CollectionNotFoundError) {
    res.status(404).json({ error: error.message });
  } else if (error instanceof ForbiddenError) {
    res.status(403).json({ error: error.message });
  } else if (error instanceof CollectionConflictError) {
    res.status(409).json({ error: error.message });
  } else if (error instanceof Error) { // Handles Zod validation errors and other generic errors
    res.status(400).json({ error: error.message });
  }
   else {
    res.status(500).json({ error: defaultMessage });
  }
}

// Formats file response, omitting sensitive fields like content and full path.
function formatFileResponse(file: any): FileResponse {
  const { content, path, user_id, ...rest } = file;
  return rest;
}

function formatFileListResponse(files: any[]): FileListResponseItem[] {
    return files.map(file => {
        const { content, path, user_id, metadata, ...rest } = file;
        // Selectively include metadata fields suitable for a list view.
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
      const apiKeyUser = req.apiKeyUser;
      if (!apiKeyUser || !apiKeyUser.userId) {
        return handleError(res, new AppError('User authentication failed to provide userId.', 401));
      }
      const userId = apiKeyUser.userId;
      const input = createCollectionSchema.parse(req.body);
      const collection = await this.collectionService.createCollection(userId, input);
      res.status(201).json(collection);
    } catch (error) {
      handleError(res, error, 'Failed to create collection.');
    }
  }

  async listCollections(req: Request, res: Response): Promise<void> {
    try {
      const apiKeyUser = req.apiKeyUser;
      if (!apiKeyUser || !apiKeyUser.userId) {
        return handleError(res, new AppError('User authentication failed to provide userId.', 401));
      }
      const userId = apiKeyUser.userId;
      const collections = await this.collectionService.getUserCollections(userId);
      res.status(200).json(collections);
    } catch (error) {
      handleError(res, error, 'Failed to list collections.');
    }
  }

  async getCollection(req: Request, res: Response): Promise<void> {
    try {
      const apiKeyUser = req.apiKeyUser;
      if (!apiKeyUser || !apiKeyUser.userId) {
        return handleError(res, new AppError('User authentication failed to provide userId.', 401));
      }
      const userId = apiKeyUser.userId;
      const { id: collectionId } = uuidParamSchema.parse(req.params);
      const collection = await this.collectionService.getCollectionById(collectionId, userId);
      res.status(200).json(collection);
    } catch (error) {
      handleError(res, error, 'Failed to get collection details.');
    }
  }

  async updateCollection(req: Request, res: Response): Promise<void> {
    try {
      const apiKeyUser = req.apiKeyUser;
      if (!apiKeyUser || !apiKeyUser.userId) {
        return handleError(res, new AppError('User authentication failed to provide userId.', 401));
      }
      const userId = apiKeyUser.userId;
      const { id: collectionId } = uuidParamSchema.parse(req.params);
      const input = updateCollectionSchema.parse(req.body);
      const updatedCollection = await this.collectionService.updateCollection(collectionId, userId, input);
      res.status(200).json(updatedCollection);
    } catch (error) {
      handleError(res, error, 'Failed to update collection.');
    }
  }

  async deleteCollection(req: Request, res: Response): Promise<void> {
    try {
      const apiKeyUser = req.apiKeyUser;
      if (!apiKeyUser || !apiKeyUser.userId) {
        return handleError(res, new AppError('User authentication failed to provide userId.', 401));
      }
      const userId = apiKeyUser.userId;
      const { id: collectionId } = uuidParamSchema.parse(req.params);
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
       const apiKeyUser = req.apiKeyUser;
       if (!apiKeyUser || !apiKeyUser.userId) {
         return handleError(res, new AppError('User authentication failed to provide userId.', 401));
       }
       const userId = apiKeyUser.userId;
       let collectionId = req.body.collectionId as string | undefined;
       console.log('[VectraApiController.uploadFile] Received collectionId from req.body:', collectionId); // DEBUG
       console.log('[VectraApiController.uploadFile] Full req.query object:', req.query); // DEBUG entire query object
       if (!collectionId && req.query.collectionId) {
         collectionId = req.query.collectionId as string | undefined;
         console.log('[VectraApiController.uploadFile] Using collectionId from req.query:', collectionId); // DEBUG
       }

       // Read content from the uploaded file path
       const content = await fs.promises.readFile(req.file.path, 'utf-8');

       const dbFile = await this.fileService.upload({
         file: req.file,
         content: content, // Pass actual content
         collectionId: collectionId,
         userId: userId,
       });

       res.status(201).json(formatFileResponse(dbFile));
     } catch (error) {
       // Multer saves to a temp path; FileService moves it.
       // If FileService.upload fails after moving, its own cleanup should handle the newPath.
       // If it fails before moving, or if fs.readFile fails, req.file.path might still exist.
       // Consider adding cleanup for req.file.path here if it's not handled robustly downstream.
       handleError(res, error, 'Failed to upload file.');
     } finally {
       // Clean up the temporary file created by Multer, if it still exists
       if (req.file && req.file.path) {
         try {
           await fs.promises.access(req.file.path); // Check if file exists
           await fs.promises.unlink(req.file.path);
         } catch (unlinkError: any) {
           // Ignore ENOENT (file already deleted), log other errors
           if (unlinkError.code !== 'ENOENT') {
             console.error('Error cleaning up multer temp file:', unlinkError);
           }
         }
       }
     }
  }

  async listFiles(req: Request, res: Response): Promise<void> {
    try {
      const apiKeyUser = req.apiKeyUser;
      if (!apiKeyUser || !apiKeyUser.userId) {
        return handleError(res, new AppError('User authentication failed to provide userId.', 401));
      }
      const userId = apiKeyUser.userId;
      // TODO: Add pagination/filtering options from query params if needed
      const { files } = await this.fileService.query(userId, {});
      res.status(200).json(formatFileListResponse(files));
    } catch (error) {
      handleError(res, error, 'Failed to list files.');
    }
  }

  async getFile(req: Request, res: Response): Promise<void> {
    try {
      const apiKeyUser = req.apiKeyUser;
      if (!apiKeyUser || !apiKeyUser.userId) {
        return handleError(res, new AppError('User authentication failed to provide userId.', 401));
      }
      const userId = apiKeyUser.userId;
      const { id: fileId } = uuidParamSchema.parse(req.params);
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
      const apiKeyUser = req.apiKeyUser;
      if (!apiKeyUser || !apiKeyUser.userId) {
        return handleError(res, new AppError('User authentication failed to provide userId.', 401));
      }
      const userId = apiKeyUser.userId;
      const { id: fileId } = uuidParamSchema.parse(req.params);
      await this.fileService.delete(userId, fileId);
      res.status(204).send();
    } catch (error) {
      handleError(res, error, 'Failed to delete file.');
    }
  }

  // --- Linking Methods ---

  async addFileToCollection(req: Request, res: Response): Promise<void> {
    try {
      const apiKeyUser = req.apiKeyUser;
      if (!apiKeyUser || !apiKeyUser.userId) {
        return handleError(res, new AppError('User authentication failed to provide userId.', 401));
      }
      const userId = apiKeyUser.userId;
      const { collectionId } = collectionIdOnlyParamSchema.parse(req.params); // Changed schema
      const { fileId } = addFileToCollectionSchema.parse(req.body);
      await this.collectionService.addFileToCollection(userId, collectionId, fileId);
      res.status(200).json({ message: 'File added to collection successfully.' });
    } catch (error) {
      handleError(res, error, 'Failed to add file to collection.');
    }
  }

  async removeFileFromCollection(req: Request, res: Response): Promise<void> {
    try {
      const apiKeyUser = req.apiKeyUser;
      if (!apiKeyUser || !apiKeyUser.userId) {
        return handleError(res, new AppError('User authentication failed to provide userId.', 401));
      }
      const userId = apiKeyUser.userId;
      const { collectionId, fileId } = collectionFileParamsSchema.parse(req.params);
      await this.collectionService.removeFileFromCollection(userId, collectionId, fileId);
      res.status(200).json({ message: 'File removed from collection successfully.' }); // 200 or 204? 200 indicates success message.
    } catch (error) {
      handleError(res, error, 'Failed to remove file from collection.');
    }
  }

  async listFilesInCollection(req: Request, res: Response): Promise<void> {
    try {
      const apiKeyUser = req.apiKeyUser;
      if (!apiKeyUser || !apiKeyUser.userId) {
        return handleError(res, new AppError('User authentication failed to provide userId.', 401));
      }
      const userId = apiKeyUser.userId;
      const { id: collectionId } = uuidParamSchema.parse(req.params);
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
      const apiKeyUser = req.apiKeyUser;
      if (!apiKeyUser || !apiKeyUser.userId) {
        return handleError(res, new AppError('User authentication failed to provide userId.', 401));
      }
      const userId = apiKeyUser.userId;
      const input = knowledgeQuerySchema.parse(req.body);

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
