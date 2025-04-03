import { db } from '@/database/connection';
// Try using the path alias instead of relative path
import type { Collection } from '@/modules/collections/collections.types'; 
import type { UserProfile } from '@/modules/auth/auth.types'; // Corrected import

const TABLE_NAME = 'collections';

export const collectionsQueries = {
  async createCollection(
    userId: UserProfile['id'], // Use UserProfile
    name: string,
    description?: string | null
  ): Promise<Collection> {
    const [newCollection] = await db(TABLE_NAME)
      .insert({
        user_id: userId,
        name,
        description,
      })
      .returning('*');
    // Explicitly cast the result from the database
    return newCollection as Collection;
  },

  async findCollectionById(
    collectionId: Collection['id'],
    userId: UserProfile['id'] // Use UserProfile
  ): Promise<Collection | undefined> {
    // Cast the potential result
    return db(TABLE_NAME)
      .where({ id: collectionId, user_id: userId })
      .first() as Promise<Collection | undefined>;
  },

  async findCollectionsByUserId(userId: UserProfile['id']): Promise<Collection[]> { // Use UserProfile
    // Cast the array result
    return db(TABLE_NAME).where({ user_id: userId }).orderBy('created_at', 'desc') as Promise<Collection[]>;
  },

  async updateCollection(
    collectionId: Collection['id'],
    userId: UserProfile['id'], // Use UserProfile
    updates: Partial<Pick<Collection, 'name' | 'description'>>
  ): Promise<Collection | undefined> {
    const [updatedCollection] = await db(TABLE_NAME)
      .where({ id: collectionId, user_id: userId })
      .update(updates)
      .returning('*');
    // Explicitly cast the result from the database
    return updatedCollection as Collection | undefined;
  },

  async deleteCollection(
    collectionId: Collection['id'],
    userId: UserProfile['id'] // Use UserProfile
  ): Promise<number> {
    // Note: Related files might be set to NULL or cascade deleted depending on schema setup.
    // Consider handling related entities (files, embeddings) if necessary before deletion.
    return db(TABLE_NAME).where({ id: collectionId, user_id: userId }).del();
  },

  async findCollectionByNameAndUserId(
    name: string,
    userId: UserProfile['id'] // Use UserProfile
  ): Promise<Collection | undefined> {
    // Cast the potential result
    return db(TABLE_NAME).where({ name, user_id: userId }).first() as Promise<Collection | undefined>;
  }
};
