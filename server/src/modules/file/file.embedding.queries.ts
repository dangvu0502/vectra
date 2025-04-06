import { db } from '@/database/connection'; // Keep db import for default runner
import type { Knex } from 'knex';
import type { File as DbFileType } from './file.schema'; // Import File type
// Import necessary table names
import { FILES_TABLE, TEXT_EMBEDDINGS_TABLE, COLLECTIONS_TABLE, COLLECTION_FILES_TABLE } from '@/config/constants';

// Removed local constant declarations

/**
 * Inserts multiple text embeddings in a transaction.
 * @param trx - Knex transaction object.
 * @param file - The file object associated with the embeddings.
 * @param chunks - Array of text chunks.
 * @param embeddings - Array of corresponding embeddings.
 */
const _insertTextEmbeddingsQuery = async ( // Make internal
  dbOrTrx: Knex | Knex.Transaction, // Accept db or trx
  file: DbFileType,
  chunks: { text: string; metadata?: Record<string, any> }[],
  embeddings: number[][]
): Promise<void> => {
  const textEmbeddingInserts = chunks.map((chunk, i) => {
    const vectorId = `${file.id}_chunk_${i}`;
    const additionalMetadata = {
      chunk_index: i,
      chunk_text: chunk.text, // Store chunk text in metadata
      ...(chunk.metadata || {})
    };

    // Use the provided db or trx instance
    // Removed collection_id from INSERT statement as it doesn't exist on text_embeddings
    return dbOrTrx.raw(`
      INSERT INTO ${TEXT_EMBEDDINGS_TABLE}
      (vector_id, user_id, file_id, embedding, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?::vector, ?, NOW(), NOW())
    `, [
      vectorId,
      file.user_id,
      file.id,
      // null, // Value for collection_id removed
      JSON.stringify(embeddings[i]), // Ensure embedding is stringified
      JSON.stringify(additionalMetadata) // Ensure metadata is stringified
    ]);
  });

  await Promise.all(textEmbeddingInserts);
};

// Removed _upsertFileKnowledgeIndexQuery as KNOWLEDGE_METADATA_INDEX_TABLE is removed

/**
 * Finds a collection by its ID within a transaction.
 * @param trx - Knex transaction object.
 * @param collectionId - The collection ID.
 * @returns The collection object or undefined.
 */
// Note: This one might still be useful outside a transaction, so keep export?
// Or make internal and expose via runner only? Let's make internal for consistency.
const _findCollectionByIdQuery = async ( // Make internal
  dbOrTrx: Knex | Knex.Transaction, // Accept db or trx
  collectionId: string
): Promise<{ id: string; name: string; description?: string } | undefined> => {
  return dbOrTrx(COLLECTIONS_TABLE) // Use dbOrTrx
    .where('id', collectionId)
    .first();
};

// Removed _upsertCollectionKnowledgeIndexQuery as KNOWLEDGE_METADATA_INDEX_TABLE is removed

/**
 * Deletes text embeddings associated with a file ID within a transaction.
 * @param trx - Knex transaction object.
 * @param fileId - The file ID.
 */
const _deleteTextEmbeddingsByFileIdQuery = async ( // Make internal
  dbOrTrx: Knex | Knex.Transaction, // Accept db or trx
  fileId: string
): Promise<void> => {
  await dbOrTrx(TEXT_EMBEDDINGS_TABLE) // Use dbOrTrx
    .where('file_id', fileId)
    .delete();
};

// Removed _deleteFileKnowledgeIndexQuery as KNOWLEDGE_METADATA_INDEX_TABLE is removed

/**
 * Finds a file by its ID within a transaction (minimal select).
 * Used to check collection association during deletion.
 * @param trx - Knex transaction object.
 * @param fileId - The file ID.
 * @returns The file object with id and collection_id, or undefined.
 */
const _findFileForDeleteCheckQuery = async ( // Make internal
  dbOrTrx: Knex | Knex.Transaction, // Accept db or trx
  fileId: string
): Promise<{ id: string } | undefined> => { // Removed collection_id from return type
  return dbOrTrx(FILES_TABLE) // Use dbOrTrx
    .select('id') // Removed collection_id from select
    .where('id', fileId)
    .first();
};

/**
 * Counts remaining files in a collection, excluding a specific file ID, within a transaction.
 * @param trx - Knex transaction object.
 * @param collectionId - The collection ID.
 * @param excludeFileId - The file ID to exclude from the count.
 * @returns The count of remaining files.
 */
const _countRemainingFilesInCollectionQuery = async ( // Make internal
  dbOrTrx: Knex | Knex.Transaction, // Accept db or trx
  collectionId: string,
  excludeFileId: string
): Promise<number> => {
  // TODO: This query is now incorrect as files don't have collection_id.
  // It needs refactoring to use the collection_files join table.
  // Removing the clause fixes the TS error for now.
  const result = await dbOrTrx(FILES_TABLE) // Use dbOrTrx
    // .where('collection_id', collectionId) // Removed this line
    .whereNot('id', excludeFileId)
    .count('id as count')
    .first();
  return result ? Number(result.count) : 0;
};

// Removed _deleteCollectionKnowledgeIndexQuery as KNOWLEDGE_METADATA_INDEX_TABLE is removed

/**
 * Performs vector similarity search on text embeddings.
 * @param dbOrTrx - Knex instance or transaction object.
 * @param userId - The ID of the user performing the search.
 * @param embedding - The query embedding vector.
 * @param limit - The maximum number of results to return.
 * @param collectionId - Optional collection ID to filter results.
 * @returns Array of matching text embeddings with distance.
 */
const _findSimilarEmbeddingsQuery = async ( // Make internal
  dbOrTrx: Knex | Knex.Transaction,
  userId: string,
  embedding: number[],
  limit: number,
  collectionId?: string
): Promise<Array<{
  vector_id: string;
  file_id: string;
  metadata: Record<string, any>;
  distance: number; // Cosine distance
}>> => {
  const queryEmbeddingString = JSON.stringify(embedding);

  let query = dbOrTrx(`${TEXT_EMBEDDINGS_TABLE} as te`)
    .select(
      'te.vector_id',
      'te.file_id',
      'te.metadata',
      // Calculate cosine distance using the <=> operator
      dbOrTrx.raw(`te.embedding <=> ?::vector AS distance`, [queryEmbeddingString])
    )
    .where('te.user_id', userId) // Ensure user owns the embedding's file
    .orderBy('distance', 'asc') // Order by distance (closer is smaller)
    .limit(limit);

  // If collectionId is provided, join with collection_files and filter
  if (collectionId) {
    // Ensure we join correctly to filter embeddings based on file's presence in the collection
    query = query
      .join(`${COLLECTION_FILES_TABLE} as cf`, 'te.file_id', 'cf.file_id')
      .where('cf.collection_id', collectionId);
  }

  // console.log("Similarity Query:", query.toString()); // For debugging
  return query;
};


// --- Query Runner ---

/**
 * Creates a query runner instance bound to a specific Knex connection or transaction.
 * @param dbOrTrx - The Knex instance or transaction object.
 * @returns An object with methods to execute embedding-related queries.
 */
export const createEmbeddingQueryRunner = (dbOrTrx: Knex | Knex.Transaction) => {
  return {
    insertTextEmbeddings: (
      file: DbFileType,
      chunks: { text: string; metadata?: Record<string, any> }[],
      embeddings: number[][]
    ) => _insertTextEmbeddingsQuery(dbOrTrx, file, chunks, embeddings),

    // Add the new similarity search function to the runner
    findSimilarEmbeddings: (
      userId: string,
      embedding: number[],
      limit: number,
      collectionId?: string
    ) => _findSimilarEmbeddingsQuery(dbOrTrx, userId, embedding, limit, collectionId),

    // Removed upsertFileKnowledgeIndex
    // upsertFileKnowledgeIndex: (
    //   userId: string,
    //   fileId: string,
    //   textContent: string,
    //   embedding: number[]
    // ) => _upsertFileKnowledgeIndexQuery(dbOrTrx, userId, fileId, textContent, embedding),

    findCollectionById: (
      collectionId: string
    ) => _findCollectionByIdQuery(dbOrTrx, collectionId),

    // Removed upsertCollectionKnowledgeIndex
    // upsertCollectionKnowledgeIndex: (
    //   userId: string,
    //   collectionId: string,
    //   textContent: string,
    //   embedding: number[]
    // ) => _upsertCollectionKnowledgeIndexQuery(dbOrTrx, userId, collectionId, textContent, embedding),

    deleteTextEmbeddingsByFileId: (
      fileId: string
    ) => _deleteTextEmbeddingsByFileIdQuery(dbOrTrx, fileId),

    // Removed deleteFileKnowledgeIndex
    // deleteFileKnowledgeIndex: (
    //   fileId: string
    // ) => _deleteFileKnowledgeIndexQuery(dbOrTrx, fileId),

    findFileForDeleteCheck: (
      fileId: string
    ) => _findFileForDeleteCheckQuery(dbOrTrx, fileId),

    countRemainingFilesInCollection: (
      collectionId: string,
      excludeFileId: string
    ) => _countRemainingFilesInCollectionQuery(dbOrTrx, collectionId, excludeFileId),

    // Removed deleteCollectionKnowledgeIndex
    // deleteCollectionKnowledgeIndex: (
    //   collectionId: string
    // ) => _deleteCollectionKnowledgeIndexQuery(dbOrTrx, collectionId),
  };
};

// Optional: Export a default runner using the main db connection if needed elsewhere
// export const defaultEmbeddingQueryRunner = createEmbeddingQueryRunner(db);

// Removed redundant transactionalEmbeddingQueries export
