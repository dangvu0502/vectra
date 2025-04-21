import { Knex } from 'knex';
import type { Collection } from './collections.types';
import type { UserProfile } from '@/modules/auth/auth.types';
import type { File as DbFileType } from '@/modules/file/file.schema';
import { fileSchema } from '@/modules/file/file.schema';
import { PG_TABLE_NAMES } from '@/database/constants';

export class CollectionQueries {
  constructor(private readonly db: Knex) {}

  async createCollection(
    userId: UserProfile['id'],
    name: string,
    description?: string | null
  ): Promise<Collection> {
    const [newCollection] = await this.db(PG_TABLE_NAMES.COLLECTIONS)
      .insert({
        user_id: userId,
        name,
        description,
      })
      .returning('*');
    return newCollection as Collection;
  }

  async findCollectionById(
    collectionId: Collection['id'],
    userId: UserProfile['id']
  ): Promise<Collection | undefined> {
    return this.db(PG_TABLE_NAMES.COLLECTIONS)
      .where({ id: collectionId, user_id: userId })
      .first() as Promise<Collection | undefined>;
  }

  async findCollectionsByUserId(userId: UserProfile['id']): Promise<Collection[]> {
    return this.db(PG_TABLE_NAMES.COLLECTIONS)
      .where({ user_id: userId })
      .orderBy('created_at', 'desc') as Promise<Collection[]>;
  }

  async updateCollection(
    collectionId: Collection['id'],
    userId: UserProfile['id'],
    updates: Partial<Pick<Collection, 'name' | 'description'>>
  ): Promise<Collection | undefined> {
    const [updatedCollection] = await this.db(PG_TABLE_NAMES.COLLECTIONS)
      .where({ id: collectionId, user_id: userId })
      .update(updates)
      .returning('*');
    return updatedCollection as Collection | undefined;
  }

  async deleteCollection(
    collectionId: Collection['id'],
    userId: UserProfile['id']
  ): Promise<number> {
    return this.db(PG_TABLE_NAMES.COLLECTIONS)
      .where({ id: collectionId, user_id: userId })
      .del();
  }

  async findCollectionByNameAndUserId(
    name: string,
    userId: UserProfile['id']
  ): Promise<Collection | undefined> {
    return this.db(PG_TABLE_NAMES.COLLECTIONS)
      .where({ name, user_id: userId })
      .first() as Promise<Collection | undefined>;
  }

  async addFileLink(
    collectionId: string,
    fileId: string,
    trx?: Knex.Transaction
  ): Promise<number> {
    const queryBuilder = trx ? trx(PG_TABLE_NAMES.COLLECTION_FILES) : this.db(PG_TABLE_NAMES.COLLECTION_FILES);
    const result = await queryBuilder
      .insert({ collection_id: collectionId, file_id: fileId })
      .onConflict(['collection_id', 'file_id'])
      .ignore();
    return 1;
  }

  async removeFileLink(
    collectionId: string,
    fileId: string,
    trx?: Knex.Transaction
  ): Promise<number> {
    const queryBuilder = trx ? trx(PG_TABLE_NAMES.COLLECTION_FILES) : this.db(PG_TABLE_NAMES.COLLECTION_FILES);
    return queryBuilder
      .where({ collection_id: collectionId, file_id: fileId })
      .delete();
  }

  async findFilesByCollectionId(
    collectionId: string,
    userId: string,
    trx?: Knex.Transaction
  ): Promise<DbFileType[]> {
    const queryBuilder = trx ? trx(PG_TABLE_NAMES.FILES) : this.db(PG_TABLE_NAMES.FILES);
    const dbFiles = await queryBuilder
      .select(`${PG_TABLE_NAMES.FILES}.*`)
      .innerJoin(PG_TABLE_NAMES.COLLECTION_FILES, `${PG_TABLE_NAMES.FILES}.id`, `${PG_TABLE_NAMES.COLLECTION_FILES}.file_id`)
      .innerJoin(PG_TABLE_NAMES.COLLECTIONS, `${PG_TABLE_NAMES.COLLECTION_FILES}.collection_id`, `${PG_TABLE_NAMES.COLLECTIONS}.id`)
      .where(`${PG_TABLE_NAMES.COLLECTION_FILES}.collection_id`, collectionId)
      .andWhere(`${PG_TABLE_NAMES.COLLECTIONS}.user_id`, userId);

    return dbFiles.map(dbFile => fileSchema.parse(dbFile));
  }

  async findCollectionsByFileId(
    fileId: string,
    userId: string,
    trx?: Knex.Transaction
  ): Promise<Collection[]> {
    const queryBuilder = trx ? trx(PG_TABLE_NAMES.COLLECTIONS) : this.db(PG_TABLE_NAMES.COLLECTIONS);
    const dbCollections = await queryBuilder
      .select(`${PG_TABLE_NAMES.COLLECTIONS}.*`)
      .innerJoin(PG_TABLE_NAMES.COLLECTION_FILES, `${PG_TABLE_NAMES.COLLECTIONS}.id`, `${PG_TABLE_NAMES.COLLECTION_FILES}.collection_id`)
      .innerJoin(PG_TABLE_NAMES.FILES, `${PG_TABLE_NAMES.COLLECTION_FILES}.file_id`, `${PG_TABLE_NAMES.FILES}.id`)
      .where(`${PG_TABLE_NAMES.COLLECTION_FILES}.file_id`, fileId)
      .andWhere(`${PG_TABLE_NAMES.FILES}.user_id`, userId);

    return dbCollections as Collection[];
  }
} 