import type { Request, Response, NextFunction } from 'express';
import { collectionsService } from './collections.service';
import {
  CreateCollectionSchema,
  UpdateCollectionSchema,
  CollectionIdParamSchema,
} from './collections.types';
import type { UserProfile } from '@/modules/auth/auth.types';
import { CollectionNotFoundError, CollectionConflictError } from '@/modules/core/errors';

// Export middleware to ensure user is authenticated
export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    // Send the response but don't return it from the function signature view
    res.status(401).send(); 
    // Do not call next() here, as the response is finished.
  } else {
    // Only call next() if authenticated
    next();
  }
};

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
};
