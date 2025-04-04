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
  FileNotFoundError, // Import FileNotFoundError
  ForbiddenError,    // Import ForbiddenError
} from '@/modules/core/errors';
import { findFileByIdQuery } from '@/modules/file/file.queries'; // Import file query for ownership check
import type { File as DbFileType } from '@/modules/file/file.schema'; // Import File type

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

  // --- File Linking Service Methods ---

  async addFileToCollection(
    userId: UserProfile['id'],
    collectionId: string,
    fileId: string
  ): Promise<void> {
    // 1. Verify the user owns the target collection
    const collection = await collectionsQueries.findCollectionById(collectionId, userId);
    if (!collection) {
      throw new CollectionNotFoundError(collectionId);
    }

    // 2. Verify the user owns the file to be added
    const file = await findFileByIdQuery(fileId); // Use query from file module
    if (!file) {
      throw new FileNotFoundError(fileId);
    }
    if (file.user_id !== userId) {
      // Prevent linking files not owned by the user, even to their own collection
      throw new ForbiddenError('User does not own the specified file.');
    }

    // 3. Create the link in the join table
    try {
      await collectionsQueries.addFileLinkQuery(collectionId, fileId);
      console.log(`Linked file ${fileId} to collection ${collectionId}`);
    } catch (error: any) {
      // Handle potential unique constraint violation if the link already exists
      if (error.code === '23505') { // Check for unique violation error code (e.g., PostgreSQL)
        console.warn(`Link between file ${fileId} and collection ${collectionId} already exists.`);
        // Consider this a success or log appropriately
      } else {
        console.error(`Error linking file ${fileId} to collection ${collectionId}:`, error);
        throw error; // Re-throw other errors
      }
    }
  },

  async removeFileFromCollection(
    userId: UserProfile['id'],
    collectionId: string,
    fileId: string
  ): Promise<void> {
    // 1. Verify the user owns the collection (ensures they can modify its links)
    const collection = await collectionsQueries.findCollectionById(collectionId, userId);
    if (!collection) {
      // If the collection doesn't exist or isn't owned, the link shouldn't be managed by this user.
      // Throwing an error might be better than silently failing.
      throw new CollectionNotFoundError(collectionId);
    }

    // 2. Remove the link from the join table
    // No need to verify file ownership here, as we're operating based on collection ownership.
    const deletedCount = await collectionsQueries.removeFileLinkQuery(collectionId, fileId);
    if (deletedCount === 0) {
      console.warn(`Attempted to remove link between file ${fileId} and collection ${collectionId}, but link did not exist.`);
    } else {
       console.log(`Removed link between file ${fileId} and collection ${collectionId}.`);
    }
  },

  async getFilesInCollection(
    userId: UserProfile['id'],
    collectionId: string
  ): Promise<DbFileType[]> {
     // Ownership is checked within the query itself (findFilesByCollectionIdQuery)
     // by joining with the collections table and filtering by user_id.
     // An initial check here is redundant but harmless.
     /*
     const collection = await collectionsQueries.findCollectionById(collectionId, userId);
     if (!collection) {
       throw new CollectionNotFoundError(collectionId);
     }
     */
     return collectionsQueries.findFilesByCollectionIdQuery(collectionId, userId);
  },

  // Optional: Method to get collections for a specific file (might be useful for FileDetailsPanel)
  async getCollectionsForFile(
    userId: UserProfile['id'],
    fileId: string
  ): Promise<Collection[]> {
    // Ownership is checked within the query itself (findCollectionsByFileIdQuery)
    // by joining with the files table and filtering by user_id.
    return collectionsQueries.findCollectionsByFileIdQuery(fileId, userId);
  }
};
