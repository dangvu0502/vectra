import { db } from "@/database/postgres/connection";
import { PG_TABLE_NAMES } from "@/database/constants";
import type { Knex } from "knex";
import type { File as DbFileType, QueryOptions } from "./file.schema";
import { fileSchema, querySchema } from "./file.schema";
import { FileNotFoundError } from '@/shared/errors';

export class FileQueries {
  constructor(private readonly db: Knex) {}

  async findFileById(userId: string, id: string, trx?: Knex.Transaction): Promise<DbFileType | null> {
    const queryBuilder = trx ? trx(PG_TABLE_NAMES.FILES) : this.db(PG_TABLE_NAMES.FILES);
    const dbFile = await queryBuilder.where({ id, user_id: userId }).first();
    return dbFile ? fileSchema.parse(dbFile) : null;
  }

  async queryFiles(userId: string, options: QueryOptions = {}): Promise<{ files: DbFileType[]; total: number }> {
    const {
      q,
      page = '1',
      limit = '10',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = querySchema.parse(options);

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum > 0 ? pageNum - 1 : 0) * limitNum;

    let queryBuilder = this.db(PG_TABLE_NAMES.FILES);
    let countQueryBuilder = this.db(PG_TABLE_NAMES.FILES);

    if (q) {
      const searchTerm = `%${q}%`;
      queryBuilder = queryBuilder.where(function() {
        this.where('filename', 'ilike', searchTerm)
          .orWhere('content', 'ilike', searchTerm);
      });
      countQueryBuilder = countQueryBuilder.where(function() {
        this.where('filename', 'ilike', searchTerm)
          .orWhere('content', 'ilike', searchTerm);
      });
    }

    const countResult = await countQueryBuilder
      .where('user_id', userId)
      .count('* as count')
      .first();
    const total = countResult ? parseInt(countResult.count as string, 10) : 0;

    const dbFiles = await queryBuilder
      .where('user_id', userId)
      .orderBy(sortBy, sortOrder)
      .offset(skip)
      .limit(limitNum)
      .select('*');

    const validatedFiles = dbFiles.map(dbFile => fileSchema.parse(dbFile));

    return {
      files: validatedFiles,
      total
    };
  }

  async insertFile(fileData: Omit<DbFileType, 'id'>, trx?: Knex.Transaction): Promise<DbFileType> {
    const queryBuilder = trx ? trx(PG_TABLE_NAMES.FILES) : this.db(PG_TABLE_NAMES.FILES);
    const [insertedRecord] = await queryBuilder
      .insert({
        ...fileData,
        created_at: fileData.created_at || new Date(),
        updated_at: fileData.updated_at || new Date(),
      })
      .returning('*');
    return fileSchema.parse(insertedRecord);
  }

  async deleteFileById(userId: string, id: string, trx?: Knex.Transaction): Promise<number> {
    const queryBuilder = trx ? trx(PG_TABLE_NAMES.FILES) : this.db(PG_TABLE_NAMES.FILES);
    return queryBuilder.where({ id, user_id: userId }).delete();
  }

  async updateFileEmbeddingSuccess(id: string, timestamp: string, trx?: Knex.Transaction): Promise<void> {
    const queryBuilder = trx ? trx(PG_TABLE_NAMES.FILES) : this.db(PG_TABLE_NAMES.FILES);
    await queryBuilder.where({ id }).update({
      metadata: this.db.raw(
        "jsonb_set(jsonb_set(metadata, '{embeddingsCreated}', 'true'), '{embeddingsTimestamp}', ?::jsonb)",
        [JSON.stringify(timestamp)]
      ),
      updated_at: new Date()
    });
  }

  async updateFileEmbeddingError(id: string, error: string, trx?: Knex.Transaction): Promise<void> {
    const queryBuilder = trx ? trx(PG_TABLE_NAMES.FILES) : this.db(PG_TABLE_NAMES.FILES);
    await queryBuilder.where({ id }).update({
      metadata: this.db.raw("jsonb_set(metadata, '{embeddingError}', ?::jsonb)", [
        JSON.stringify(error),
      ]),
      updated_at: new Date()
    });
  }
}
