import type { Request, Response, NextFunction } from 'express';
import { CollectionService } from './collections.service';
import type { UserProfile } from '@/modules/auth/auth.types';
import {
  createCollectionSchema,
  updateCollectionSchema,
  collectionIdParamSchema,
  addFileToCollectionSchema,
  removeFileFromCollectionSchema,
} from './collections.validation';
import {
  CollectionNotFoundError,
  CollectionConflictError,
  FileNotFoundError,
  ForbiddenError,
} from '@/shared/errors';
import { z } from 'zod';
import { EmbeddingService } from '@/modules/file/file.embedding.service';
import { db } from '@/database/postgres/connection';

const embeddingService = EmbeddingService.getInstance(db);

interface AuthenticatedRequest extends Request {
  user: UserProfile;
}

export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  async createCollection(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createCollectionSchema.parse(req.body);
      const userId = req.user.id;

      const collection = await this.collectionService.createCollection(userId, input);
      res.status(201).json(collection);
    } catch (error) {
      if (error instanceof CollectionConflictError) {
        res.status(409).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  async getUserCollections(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id;
      const collections = await this.collectionService.getUserCollections(userId);
      res.status(200).json(collections);
    } catch (error) {
      next(error);
    }
  }

  async getCollectionById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { collectionId } = collectionIdParamSchema.parse(req.params);
      const userId = req.user.id;

      const collection = await this.collectionService.getCollectionById(collectionId, userId);
      res.status(200).json(collection);
    } catch (error) {
      if (error instanceof CollectionNotFoundError) {
        res.status(404).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  async updateCollection(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { collectionId } = collectionIdParamSchema.parse(req.params);
      const input = updateCollectionSchema.parse(req.body);
      const userId = req.user.id;

      if (Object.keys(input).length === 0) {
        res.status(400).json({ message: 'No update fields provided.' });
        return;
      }

      const collection = await this.collectionService.updateCollection(collectionId, userId, input);
      res.status(200).json(collection);
    } catch (error) {
      if (error instanceof CollectionNotFoundError) {
        res.status(404).json({ message: error.message });
        return;
      }
      if (error instanceof CollectionConflictError) {
        res.status(409).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  async deleteCollection(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { collectionId } = collectionIdParamSchema.parse(req.params);
      const userId = req.user.id;

      await this.collectionService.deleteCollection(collectionId, userId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof CollectionNotFoundError) {
        res.status(404).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  async getCollectionFiles(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { collectionId } = collectionIdParamSchema.parse(req.params);
      const userId = req.user.id;

      const collection = await this.collectionService.getFilesInCollection(userId, collectionId);
      res.status(200).json({
        status: 'success',
        data: { files: collection.files, total: collection.files.length }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid collection ID', errors: error.errors });
        return;
      }
      if (error instanceof CollectionNotFoundError) {
        res.status(404).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  async addFileToCollection(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { collectionId } = collectionIdParamSchema.parse(req.params);
      const { fileId } = addFileToCollectionSchema.parse(req.body);
      const userId = req.user.id;

      await this.collectionService.addFileToCollection(userId, collectionId, fileId);
      res.status(200).json({ message: 'File added to collection successfully.' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid request data', errors: error.errors });
        return;
      }
      if (error instanceof CollectionNotFoundError || error instanceof FileNotFoundError) {
        res.status(404).json({ message: error.message });
        return;
      }
      if (error instanceof ForbiddenError) {
        res.status(403).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  async removeFileFromCollection(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { collectionId } = collectionIdParamSchema.parse(req.params);
      const { fileId } = removeFileFromCollectionSchema.parse(req.body);
      const userId = req.user.id;

      await this.collectionService.removeFileFromCollection(userId, collectionId, fileId);
      res.status(200).json({ message: 'File removed from collection successfully.' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid request parameters', errors: error.errors });
        return;
      }
      if (error instanceof CollectionNotFoundError) {
        res.status(404).json({ message: error.message });
        return;
      }
      if (error instanceof ForbiddenError) {
        res.status(403).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  async queryCollection(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { collectionId } = collectionIdParamSchema.parse(req.params);
      const {
        queryText,
        limit,
        enableGraphSearch,
        graphDepth,
        graphTopN,
        graphRelationshipTypes
      } = req.body;
      const userId = req.user.id;

      const results = await embeddingService.queryEmbeddings({
        userId,
        queryText,
        limit,
        collectionId,
        enableGraphSearch,
        graphDepth,
        graphTopN,
        graphRelationshipTypes,
      });

      res.status(200).json({
        status: 'success',
        data: { results }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid request data', errors: error.errors });
        return;
      }
      if (error instanceof CollectionNotFoundError) {
        res.status(404).json({ message: error.message });
        return;
      }
      console.error("Error during collection query:", error);
      next(error);
    }
  }
}
