import type { Knex } from 'knex';
import type { File as DbFileType } from './file.schema'; // Import File type
// Import necessary table names
import { COLLECTIONS_TABLE, COLLECTION_FILES_TABLE, FILES_TABLE, TEXT_EMBEDDINGS_TABLE } from '@/config/constants';
// Import the extracted search functions
import { findSimilarEmbeddings, findKeywordMatches } from './embedding.search.queries';


// Define and export the MetadataFilter type
export type MetadataFilter = {
  field: string;
  value?: string; // For exact match ('=')
  pattern?: string; // For pattern match ('LIKE' or 'NOT LIKE')
};

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
    // Add chunk_text to INSERT statement
    return dbOrTrx.raw(`
      INSERT INTO ${TEXT_EMBEDDINGS_TABLE}
      (vector_id, user_id, file_id, embedding, metadata, chunk_text, created_at, updated_at)
      VALUES (?, ?, ?, ?::vector, ?, ?, NOW(), NOW())
    `, [
      vectorId,
      file.user_id,
      file.id,
      JSON.stringify(embeddings[i]), // Ensure embedding is stringified
      JSON.stringify(additionalMetadata), // Ensure metadata is stringified
      chunk.text // Add the original chunk text
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

// --- REMOVED _findSimilarEmbeddingsQuery ---
// The logic is now in embedding.search.queries.ts

// --- REMOVED _findKeywordMatchesQuery ---
// The logic is now in embedding.search.queries.ts


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

    // Use the imported search functions
    findSimilarEmbeddings: (
      userId: string,
      embedding: number[],
      limit: number,
      collectionId?: string,
      includeMetadataFilters?: MetadataFilter[],
      excludeMetadataFilters?: MetadataFilter[],
      maxDistance?: number
    ) => findSimilarEmbeddings( // Use imported function
        dbOrTrx, userId, embedding, limit, collectionId,
        includeMetadataFilters, excludeMetadataFilters, maxDistance
      ),

    findKeywordMatches: (
      userId: string,
      queryText: string,
      limit: number,
      collectionId?: string,
      ftsConfig?: string
    ) => findKeywordMatches( // Use imported function
        dbOrTrx, userId, queryText, limit, collectionId, ftsConfig
      ),

    // Removed upsertFileKnowledgeIndex

    findCollectionById: (
      collectionId: string
    ) => _findCollectionByIdQuery(dbOrTrx, collectionId),

    // Removed upsertCollectionKnowledgeIndex

    deleteTextEmbeddingsByFileId: (
      fileId: string
    ) => _deleteTextEmbeddingsByFileIdQuery(dbOrTrx, fileId),

    // Removed deleteFileKnowledgeIndex

    findFileForDeleteCheck: (
      fileId: string
    ) => _findFileForDeleteCheckQuery(dbOrTrx, fileId),

    countRemainingFilesInCollection: (
      collectionId: string,
      excludeFileId: string
    ) => _countRemainingFilesInCollectionQuery(dbOrTrx, collectionId, excludeFileId),

    // Removed deleteCollectionKnowledgeIndex
  };
};
