import { db } from "@/database/connection";
// Removed duplicate: import { db } from '@/database/connection';
import { PG_TABLE_NAMES } from "@/database/constants"; // Import PG constants
import type { Knex } from "knex";
import type { File as DbFileType, QueryOptions } from "./file.schema"; // Keep using types from model
import { fileSchema, querySchema } from "./file.schema"; // Import necessary schemas
// Removed unused import: import { FILES_TABLE } from '@/config/constants';

/**
 * Inserts a new file record into the database.
 * @param fileData - The data for the file to insert.
 * @param trx - Optional transaction object.
 * @returns The newly created file record.
 */
export const insertFileQuery = async (
  fileData: Omit<DbFileType, "created_at" | "updated_at"> & {
    created_at?: Date;
    updated_at?: Date;
  }, // Adjust type slightly for insertion flexibility
  trx?: Knex.Transaction
): Promise<DbFileType> => {
  const queryBuilder = trx
    ? trx(PG_TABLE_NAMES.FILES)
    : db(PG_TABLE_NAMES.FILES);
  const [insertedRecord] = await queryBuilder
    .insert({
      ...fileData,
      created_at: fileData.created_at || new Date(), // Ensure dates are set
      updated_at: fileData.updated_at || new Date(),
    })
    .returning("*");
  return fileSchema.parse(insertedRecord); // Validate on return
};

/**
 * Updates the metadata of a file record to mark embedding success.
 * @param fileId - The ID of the file to update.
 * @param timestamp - The timestamp when embeddings were created.
 * @param trx - Optional transaction object.
 * @returns The number of updated rows.
 */
export const updateFileEmbeddingSuccessQuery = async (
  fileId: string,
  timestamp: string,
  trx?: Knex.Transaction
): Promise<number> => {
  const queryBuilder = trx
    ? trx(PG_TABLE_NAMES.FILES)
    : db(PG_TABLE_NAMES.FILES);
  return queryBuilder.where({ id: fileId }).update({
    metadata: db.raw(
      "jsonb_set(jsonb_set(metadata, '{embeddingsCreated}', 'true'), '{embeddingsTimestamp}', ?::jsonb)",
      [JSON.stringify(timestamp)]
    ),
    updated_at: new Date(),
  });
};

/**
 * Updates the metadata of a file record to mark embedding failure.
 * @param fileId - The ID of the file to update.
 * @param errorMsg - The error message.
 * @param trx - Optional transaction object.
 * @returns The number of updated rows.
 */
export const updateFileEmbeddingErrorQuery = async (
  fileId: string,
  errorMsg: string,
  trx?: Knex.Transaction
): Promise<number> => {
  const queryBuilder = trx
    ? trx(PG_TABLE_NAMES.FILES)
    : db(PG_TABLE_NAMES.FILES);
  return queryBuilder.where({ id: fileId }).update({
    metadata: db.raw("jsonb_set(metadata, '{embeddingError}', ?::jsonb)", [
      JSON.stringify(errorMsg),
    ]),
    updated_at: new Date(),
  });
};

/**
 * Queries files based on provided options (search, pagination, sorting).
 * @param options - Query options including search term, page, limit, sortBy, sortOrder.
 * @returns An object containing the list of files and the total count.
 */
export const queryFilesQuery = async (
  userId: string,
  options: QueryOptions = {}
): Promise<{ files: DbFileType[]; total: number }> => {
  const {
    q,
    page = "1",
    limit = "10",
    sortBy = "created_at",
    sortOrder = "desc",
  } = querySchema.parse(options);

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum > 0 ? pageNum - 1 : 0) * limitNum;

  let queryBuilder = db(PG_TABLE_NAMES.FILES);
  let countQueryBuilder = db(PG_TABLE_NAMES.FILES); // Separate builder for count

  if (q) {
    const searchTerm = `%${q}%`;
    queryBuilder = queryBuilder.where("filename", "ilike", searchTerm);
    countQueryBuilder = countQueryBuilder.where(
      "filename",
      "ilike",
      searchTerm
    );
  }

  // Get total count
  const countResult = await countQueryBuilder.count("* as count").first();
  const total = countResult ? parseInt(countResult.count as string, 10) : 0;

  // Get paginated results
  const dbFiles = await queryBuilder
    .where("user_id", userId)
    .orderBy(sortBy, sortOrder)
    .offset(skip)
    .limit(limitNum)
    .select("*");

  const validatedFiles = dbFiles.map((dbFile) => fileSchema.parse(dbFile));

  return {
    files: validatedFiles,
    total,
  };
};

/**
 * Finds a file by its ID.
 * @param id - The ID of the file to find.
 * @param trx - Optional transaction object.
 * @returns The file record if found, otherwise null.
 */
export const findFileByIdQuery = async (
  userId: string,
  id: string,
  trx?: Knex.Transaction
): Promise<DbFileType | null> => {
  const queryBuilder = trx
    ? trx(PG_TABLE_NAMES.FILES)
    : db(PG_TABLE_NAMES.FILES);
  const dbFile = await queryBuilder.where({ id, user_id: userId }).first();
  return dbFile ? fileSchema.parse(dbFile) : null;
};

/**
 * Deletes a file record by its ID.
 * @param id - The ID of the file to delete.
 * @param trx - Optional transaction object.
 * @returns The number of deleted rows.
 */
export const deleteFileByIdQuery = async (
  userId: string,
  id: string,
  trx?: Knex.Transaction
): Promise<number> => {
  const queryBuilder = trx
    ? trx(PG_TABLE_NAMES.FILES)
    : db(PG_TABLE_NAMES.FILES);
  return queryBuilder.where({ id, user_id: userId }).delete();
};

// --- Collection File Link Queries (Moved to collections.queries.ts as per comment) ---
// Removing the duplicated findCollectionsByFileIdQuery function from this file.
