import type { Request, Response, NextFunction } from 'express';
import { collectionsService } from './collections.service';
import {
  CreateCollectionSchema,
  UpdateCollectionSchema,
  CollectionIdParamSchema,
  // Import the moved schemas
  QueryCollectionBodySchema,
  AddFileToCollectionParamsSchema,
  AddFileToCollectionBodySchema,
  RemoveFileFromCollectionParamsSchema,
  GetFilesInCollectionParamsSchema
} from './collections.types';
import type { UserProfile } from '@/modules/auth/auth.types';
import {
  CollectionNotFoundError,
  CollectionConflictError,
  FileNotFoundError, // Import other needed errors
  ForbiddenError
} from '@/shared/errors';
import { TEST_USER_ID } from '@/config/constants';
import { z } from 'zod'; // Import Zod for validation
import { db } from '@/database/connection'; // Import the database connection instance
// Import the embedding service instance
import { EmbeddingService } from '@/modules/file/file.embedding.service';
const embeddingService = EmbeddingService.getInstance(db); // Use the imported db instance


export const collectionsController = {
  // POST /collections - Create a new collection
  async createCollection(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedBody = CreateCollectionSchema.parse(req.body);
      const user = req.user as UserProfile; // Assumes passport adds user to req

      const newCollection = await collectionsService.createCollection(
        user.id,
        validatedBody
      );
      res.status(201).json(newCollection);
    } catch (error) {
      if (error instanceof CollectionConflictError) {
        // Send response, don't return
        res.status(409).json({ message: error.message }); 
        return; // End execution for this handler
      }
      // Handle Zod validation errors or other errors
      next(error);
    }
  },

  // GET /collections - Get all collections for the logged-in user
  async getUserCollections(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as UserProfile;
      const collections = await collectionsService.getUserCollections(user.id);
      res.status(200).json(collections);
    } catch (error) {
      next(error);
    }
  },

  // GET /collections/:collectionId - Get a specific collection by ID
  async getCollectionById(req: Request, res: Response, next: NextFunction) {
    try {
      const { collectionId } = CollectionIdParamSchema.parse(req.params);
      const user = req.user as UserProfile;

      const collection = await collectionsService.getCollectionById(
        collectionId,
        user.id
      );
      res.status(200).json(collection);
    } catch (error) {
      if (error instanceof CollectionNotFoundError) {
         // Send response, don't return
        res.status(404).json({ message: error.message });
        return; // End execution for this handler
      }
      next(error);
    }
  },

  // PUT /collections/:collectionId - Update a specific collection
  async updateCollection(req: Request, res: Response, next: NextFunction) {
    try {
      const { collectionId } = CollectionIdParamSchema.parse(req.params);
      const validatedBody = UpdateCollectionSchema.parse(req.body);
      const user = req.user as UserProfile;

      // Ensure there's something to update
      if (Object.keys(validatedBody).length === 0) {
           res.status(400).json({ message: 'No update fields provided.' });
           return; // End execution for this handler
      }

      const updatedCollection = await collectionsService.updateCollection(
        collectionId,
        user.id,
        validatedBody
      );
      res.status(200).json(updatedCollection);
    } catch (error) {
      if (error instanceof CollectionNotFoundError) {
         // Send response, don't return
        res.status(404).json({ message: error.message });
        return; // End execution for this handler
      }
      if (error instanceof CollectionConflictError) {
         // Send response, don't return
        res.status(409).json({ message: error.message });
        return; // End execution for this handler
      }
      next(error);
    }
  },

  // DELETE /collections/:collectionId - Delete a specific collection
  async deleteCollection(req: Request, res: Response, next: NextFunction) {
    try {
      const { collectionId } = CollectionIdParamSchema.parse(req.params);
      const user = req.user as UserProfile;

      await collectionsService.deleteCollection(collectionId, user.id);
      res.status(204).send(); // No content on successful deletion
    } catch (error) {
      if (error instanceof CollectionNotFoundError) {
         // Send response, don't return
        res.status(404).json({ message: error.message });
        return; // End execution for this handler
      }
      next(error);
    }
  },

  // --- File Linking Controller Methods ---

  // GET /collections/:collectionId/files
  async getCollectionFiles(req: Request, res: Response, next: NextFunction) {
    try {
      const { collectionId } = GetFilesInCollectionParamsSchema.parse(req.params);
      const user = req.user as UserProfile;

      const files = await collectionsService.getFilesInCollection(user.id, collectionId);
      res.status(200).json({
        status: 'success',
        data: { files, total: files.length }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return void res.status(400).json({ message: 'Invalid collection ID', errors: error.errors });
      }
      if (error instanceof CollectionNotFoundError) {
        return void res.status(404).json({ message: error.message });
      }
      next(error);
    }
  },

  // POST /collections/:collectionId/files
  async addFileToCollection(req: Request, res: Response, next: NextFunction) {
    try {
      const { collectionId } = AddFileToCollectionParamsSchema.parse(req.params);
      const { fileId } = AddFileToCollectionBodySchema.parse(req.body);
      const user = req.user as UserProfile;

      await collectionsService.addFileToCollection(user.id, collectionId, fileId);
      res.status(200).json({ message: 'File added to collection successfully.' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return void res.status(400).json({ message: 'Invalid request data', errors: error.errors });
      }
      if (error instanceof CollectionNotFoundError || error instanceof FileNotFoundError) {
        return void res.status(404).json({ message: error.message });
      }
      if (error instanceof ForbiddenError) {
         return void res.status(403).json({ message: error.message });
      }
      next(error);
    }
  },

  // DELETE /collections/:collectionId/files/:fileId
  async removeFileFromCollection(req: Request, res: Response, next: NextFunction) {
     try {
      const { collectionId, fileId } = RemoveFileFromCollectionParamsSchema.parse(req.params);
      const user = req.user as UserProfile;

      await collectionsService.removeFileFromCollection(user.id, collectionId, fileId);
      res.status(200).json({ message: 'File removed from collection successfully.' }); // Send 200 on success
    } catch (error) {
       if (error instanceof z.ZodError) {
        return void res.status(400).json({ message: 'Invalid request parameters', errors: error.errors });
      }
      if (error instanceof CollectionNotFoundError) { // Only check CollectionNotFound here
        return void res.status(404).json({ message: error.message });
      }
       // ForbiddenError check might not be strictly necessary if CollectionNotFound covers ownership
       if (error instanceof ForbiddenError) {
         return void res.status(403).json({ message: error.message });
       }
      next(error);
    }
  },

  // POST /collections/:collectionId/query - Query embeddings within a collection
  async queryCollection(req: Request, res: Response, next: NextFunction) {
    try {
      const { collectionId } = CollectionIdParamSchema.parse(req.params);
      // Parse the full body including optional graph params
      const {
        queryText,
        limit,
        enableGraphSearch,
        graphDepth,
        graphTopN,
        graphRelationshipTypes
      } = QueryCollectionBodySchema.parse(req.body);
      const user = req.user as UserProfile;

      // Call the embedding service, passing all parameters
      const results = await embeddingService.queryEmbeddings({
        userId: user.id,
        queryText,
        limit,
        collectionId, // Pass the collection ID for filtering
        // Pass graph parameters
        enableGraphSearch,
        graphDepth,
        graphTopN,
        graphRelationshipTypes,
        // TODO: Consider adding searchMode, maxDistance etc. to the API if needed
      });

      res.status(200).json({
        status: 'success',
        data: { results }
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return void res.status(400).json({ message: 'Invalid request data', errors: error.errors });
      }
      if (error instanceof CollectionNotFoundError) {
        return void res.status(404).json({ message: error.message });
      }
      // Handle potential errors from embedding service or query
      console.error("Error during collection query:", error);
      next(error); // Pass to generic error handler
    }
  },
};
