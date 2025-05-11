import type { Knex } from 'knex';
import type { File as DbFileType } from './file.schema';
import { PG_TABLE_NAMES } from '@/database/constants';
// findSimilarEmbeddings and findKeywordMatches are used by embedding.query.strategies.ts

export type MetadataFilter = {
  field: string;
  value?: string; 
  pattern?: string;
};

/**
 * Inserts multiple text embeddings.
 * @param dbOrTrx - Knex connection or transaction object.
 * @param file - The file object associated with the embeddings.
 * @param chunks - Array of text chunks.
 * @param embeddings - Array of corresponding embeddings.
 * @returns Array of objects containing the generated vectorId and metadata for each chunk.
 */
const _insertTextEmbeddingsQuery = async (
  dbOrTrx: Knex | Knex.Transaction,
  file: DbFileType,
  chunks: { text: string; metadata?: Record<string, any> }[],
  embeddings: number[][]
): Promise<{ vectorId: string; metadata: Record<string, any> }[]> => {
  const insertedChunkData: { vectorId: string; metadata: Record<string, any> }[] = [];

  const textEmbeddingInserts = chunks.map((chunk, i) => {
    const vectorId = `${file.id}_chunk_${i}`;
    const additionalMetadata = {
      chunk_index: i,
      chunk_text: chunk.text,
      ...(chunk.metadata || {})
    };
    insertedChunkData.push({ vectorId, metadata: additionalMetadata });

    return dbOrTrx.raw(`
      INSERT INTO ${PG_TABLE_NAMES.TEXT_EMBEDDINGS}
      (vector_id, user_id, file_id, embedding, metadata, chunk_text, created_at, updated_at)
      VALUES (?, ?, ?, ?::vector, ?, ?, NOW(), NOW())
    `, [
      vectorId,
      file.user_id,
      file.id,
      JSON.stringify(embeddings[i]), // Ensure embedding vector is stringified for DB
      JSON.stringify(additionalMetadata), // Ensure metadata object is stringified for DB
      chunk.text
    ]);
  });

  await Promise.all(textEmbeddingInserts);
  return insertedChunkData;
};

/**
 * Finds a collection by its ID.
 * @param dbOrTrx - Knex connection or transaction object.
 * @param collectionId - The collection ID.
 * @returns The collection object or undefined.
 */
// Note: This query is kept internal as it's primarily used within transactional contexts by the runner.
const _findCollectionByIdQuery = async (
  dbOrTrx: Knex | Knex.Transaction,
  collectionId: string
): Promise<{ id: string; name: string; description?: string } | undefined> => {
  return dbOrTrx(PG_TABLE_NAMES.COLLECTIONS)
    .where('id', collectionId)
    .first();
};

/**
 * Deletes text embeddings associated with a file ID.
 * @param dbOrTrx - Knex connection or transaction object.
 * @param fileId - The file ID.
 */
const _deleteTextEmbeddingsByFileIdQuery = async (
  dbOrTrx: Knex | Knex.Transaction,
  fileId: string
): Promise<void> => {
  await dbOrTrx(PG_TABLE_NAMES.TEXT_EMBEDDINGS)
    .where('file_id', fileId)
    .delete();
};

/**
 * Finds a file by its ID (minimal select, for existence checks).
 * @param dbOrTrx - Knex connection or transaction object.
 * @param fileId - The file ID.
 * @returns The file object with id, or undefined.
 */
const _findFileForDeleteCheckQuery = async (
  dbOrTrx: Knex | Knex.Transaction,
  fileId: string
): Promise<{ id: string } | undefined> => {
  return dbOrTrx(PG_TABLE_NAMES.FILES)
    .select('id')
    .where('id', fileId)
    .first();
 };

 /**
  * Creates a query runner instance with methods bound to a specific Knex connection or transaction.
  * This allows these queries to be part of a larger transaction managed by a service.
  * @param dbOrTrx - The Knex instance or transaction object.
  * @returns An object with methods to execute embedding-related queries.
  */
export const createEmbeddingQueryRunner = (dbOrTrx: Knex | Knex.Transaction) => {
  return {
    insertTextEmbeddings: (
      file: DbFileType,
      chunks: { text: string; metadata?: Record<string, any> }[],
      embeddings: number[][]
    ): Promise<{ vectorId: string; metadata: Record<string, any> }[]> =>
      _insertTextEmbeddingsQuery(dbOrTrx, file, chunks, embeddings),

    // Note: findSimilarEmbeddings and findKeywordMatches are now directly used by embedding.query.strategies.ts,
    // which can utilize this runner if transactional behavior is needed for those search queries.

    findCollectionById: (
      collectionId: string
    ) => _findCollectionByIdQuery(dbOrTrx, collectionId),

    deleteTextEmbeddingsByFileId: (
      fileId: string
    ) => _deleteTextEmbeddingsByFileIdQuery(dbOrTrx, fileId),

    findFileForDeleteCheck: (
       fileId: string
     ) => _findFileForDeleteCheckQuery(dbOrTrx, fileId),
   };
 };
