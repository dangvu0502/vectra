import { db } from '@/database/connection';
import type { Knex } from 'knex'; // Import Knex type
import type { Collection } from '@/modules/collections/collections.types';
import { PG_TABLE_NAMES } from '@/database/constants'; // Import PG constants
// Removed duplicate: import type { Knex } from 'knex';
// Removed duplicate: import type { Collection } from '@/modules/collections/collections.types';
import type { UserProfile } from '@/modules/auth/auth.types';
import type { File as DbFileType } from '@/modules/file/file.schema'; // Import File type
import { fileSchema } from '@/modules/file/file.schema'; // Import file schema for validation
// Removed unused import: import { FILES_TABLE } from '@/config/constants';

// const TABLE_NAME = 'collections'; // Removed, use constant
// const JOIN_TABLE_NAME = 'collection_files'; // Removed, use constant

export const collectionsQueries = {
  async createCollection(
    userId: UserProfile['id'], // Use UserProfile
    name: string,
    description?: string | null
  ): Promise<Collection> {
    const [newCollection] = await db(PG_TABLE_NAMES.COLLECTIONS)
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
    return db(PG_TABLE_NAMES.COLLECTIONS)
      .where({ id: collectionId, user_id: userId })
      .first() as Promise<Collection | undefined>;
  },

  async findCollectionsByUserId(userId: UserProfile['id']): Promise<Collection[]> { // Use UserProfile
    // Cast the array result
    return db(PG_TABLE_NAMES.COLLECTIONS).where({ user_id: userId }).orderBy('created_at', 'desc') as Promise<Collection[]>;
  },

  async updateCollection(
    collectionId: Collection['id'],
    userId: UserProfile['id'], // Use UserProfile
    updates: Partial<Pick<Collection, 'name' | 'description'>>
  ): Promise<Collection | undefined> {
    const [updatedCollection] = await db(PG_TABLE_NAMES.COLLECTIONS)
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
    return db(PG_TABLE_NAMES.COLLECTIONS).where({ id: collectionId, user_id: userId }).del();
  },

  async findCollectionByNameAndUserId(
    name: string,
    userId: UserProfile['id'] // Use UserProfile
  ): Promise<Collection | undefined> {
    // Cast the potential result
    return db(PG_TABLE_NAMES.COLLECTIONS).where({ name, user_id: userId }).first() as Promise<Collection | undefined>;
  },

  // --- Collection File Link Queries ---

  /**
   * Creates a link between a file and a collection in the join table.
   */
  async addFileLinkQuery(
    collectionId: string,
    fileId: string,
    trx?: Knex.Transaction
  ): Promise<number> {
    const queryBuilder = trx ? trx(PG_TABLE_NAMES.COLLECTION_FILES) : db(PG_TABLE_NAMES.COLLECTION_FILES);
    const result = await queryBuilder
      .insert({ collection_id: collectionId, file_id: fileId })
      .onConflict(['collection_id', 'file_id'])
      .ignore();
    // Assume success if no error (ignore handles existing links)
    return 1;
  },

  /**
   * Removes a link between a file and a collection from the join table.
   */
  async removeFileLinkQuery(
    collectionId: string,
    fileId: string,
    trx?: Knex.Transaction
  ): Promise<number> {
    const queryBuilder = trx ? trx(PG_TABLE_NAMES.COLLECTION_FILES) : db(PG_TABLE_NAMES.COLLECTION_FILES);
    return queryBuilder
      .where({ collection_id: collectionId, file_id: fileId })
      .delete();
  },

  /**
   * Finds all files associated with a specific collection ID for a given user.
   */
  async findFilesByCollectionIdQuery(
    collectionId: string,
    userId: string,
    trx?: Knex.Transaction
  ): Promise<DbFileType[]> {
    const queryBuilder = trx ? trx(PG_TABLE_NAMES.FILES) : db(PG_TABLE_NAMES.FILES);
    const dbFiles = await queryBuilder
      .select(`${PG_TABLE_NAMES.FILES}.*`)
      .innerJoin(PG_TABLE_NAMES.COLLECTION_FILES, `${PG_TABLE_NAMES.FILES}.id`, `${PG_TABLE_NAMES.COLLECTION_FILES}.file_id`)
      .innerJoin(PG_TABLE_NAMES.COLLECTIONS, `${PG_TABLE_NAMES.COLLECTION_FILES}.collection_id`, `${PG_TABLE_NAMES.COLLECTIONS}.id`)
      .where(`${PG_TABLE_NAMES.COLLECTION_FILES}.collection_id`, collectionId)
      .andWhere(`${PG_TABLE_NAMES.COLLECTIONS}.user_id`, userId); // Ensure user owns the collection

    return dbFiles.map(dbFile => fileSchema.parse(dbFile));
  },

  /**
   * Finds all collections associated with a specific file ID for a given user.
   */
  async findCollectionsByFileIdQuery(
    fileId: string,
    userId: string,
    trx?: Knex.Transaction
  ): Promise<Collection[]> {
    const queryBuilder = trx ? trx(PG_TABLE_NAMES.COLLECTIONS) : db(PG_TABLE_NAMES.COLLECTIONS);
    const dbCollections = await queryBuilder
      .select(`${PG_TABLE_NAMES.COLLECTIONS}.*`)
      .innerJoin(PG_TABLE_NAMES.COLLECTION_FILES, `${PG_TABLE_NAMES.COLLECTIONS}.id`, `${PG_TABLE_NAMES.COLLECTION_FILES}.collection_id`)
      .innerJoin(PG_TABLE_NAMES.FILES, `${PG_TABLE_NAMES.COLLECTION_FILES}.file_id`, `${PG_TABLE_NAMES.FILES}.id`)
      .where(`${PG_TABLE_NAMES.COLLECTION_FILES}.file_id`, fileId)
      .andWhere(`${PG_TABLE_NAMES.FILES}.user_id`, userId); // Ensure user owns the file

    // TODO: Validate results against CollectionSchema if needed
    return dbCollections as Collection[]; // Cast result
  }
};
