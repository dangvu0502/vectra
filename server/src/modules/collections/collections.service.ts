import { collectionsQueries } from './collections.queries';
import type {
  Collection,
  CreateCollectionInput,
  UpdateCollectionInput,
} from './collections.types';
import type { UserProfile } from '@/modules/auth/auth.types';
import {
  CollectionNotFoundError,
  CollectionConflictError,
} from '@/modules/core/errors'; // Use specific collection errors

export const collectionsService = {
  async createCollection(
    userId: UserProfile['id'],
    input: CreateCollectionInput
  ): Promise<Collection> {
    // Check for duplicate name for the same user
    const existing = await collectionsQueries.findCollectionByNameAndUserId(
      input.name,
      userId
    );
    if (existing) {
      // Use specific conflict error
      throw new CollectionConflictError(input.name);
    }

    return collectionsQueries.createCollection(
      userId,
      input.name,
      input.description
    );
  },

  async getCollectionById(
    collectionId: Collection['id'],
    userId: UserProfile['id']
  ): Promise<Collection> {
    const collection = await collectionsQueries.findCollectionById(
      collectionId,
      userId
    );
    if (!collection) {
      // Use specific not found error
      throw new CollectionNotFoundError(collectionId);
    }
    return collection;
  },

  async getUserCollections(userId: UserProfile['id']): Promise<Collection[]> {
    return collectionsQueries.findCollectionsByUserId(userId);
  },

  async updateCollection(
    collectionId: Collection['id'],
    userId: UserProfile['id'],
    input: UpdateCollectionInput
  ): Promise<Collection> {
    // Check if the target collection exists
    const existingCollection = await collectionsQueries.findCollectionById(
      collectionId,
      userId
    );
    if (!existingCollection) {
      // Use specific not found error
      throw new CollectionNotFoundError(collectionId);
    }

    // If name is being updated, check for conflicts with other collections
    if (input.name && input.name !== existingCollection.name) {
      const conflictingCollection =
        await collectionsQueries.findCollectionByNameAndUserId(input.name, userId);
      if (conflictingCollection) {
        // Use specific conflict error
        throw new CollectionConflictError(input.name);
      }
    }

    const updatedCollection = await collectionsQueries.updateCollection(
      collectionId,
      userId,
      input
    );
    if (!updatedCollection) {
      // Should ideally not happen if the initial check passed, but good practice
      // Use specific not found error
      throw new CollectionNotFoundError(collectionId);
    }
    return updatedCollection;
  },

  async deleteCollection(
    collectionId: Collection['id'],
    userId: UserProfile['id']
  ): Promise<void> {
    const deletedCount = await collectionsQueries.deleteCollection(
      collectionId,
      userId
    );
    if (deletedCount === 0) {
      // Use specific not found error
      throw new CollectionNotFoundError(collectionId);
    }
    // Add any additional cleanup logic here if needed (e.g., deleting associated embeddings)
  },
};
