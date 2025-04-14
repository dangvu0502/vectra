import type { Knex } from 'knex';
import type { File as DbFileType } from './file.schema'; // Import File type
import { PG_TABLE_NAMES } from '@/database/constants'; // Import PG constants
// Removed incorrect import: import { COLLECTIONS_TABLE, COLLECTION_FILES_TABLE, FILES_TABLE, TEXT_EMBEDDINGS_TABLE } from '@/config/constants';
// Import the extracted search functions
import { findSimilarEmbeddings, findKeywordMatches } from './embedding.search.queries';


// Define and export the MetadataFilter type
export type MetadataFilter = {
  field: string;
  value?: string; // For exact match ('=')
  pattern?: string; // For pattern match ('LIKE' or 'NOT LIKE')
};


/**
 * Inserts multiple text embeddings in a transaction.
 * @param trx - Knex transaction object.
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
): Promise<{ vectorId: string; metadata: Record<string, any> }[]> => { // Updated return type
  const insertedChunkData: { vectorId: string; metadata: Record<string, any> }[] = [];

  const textEmbeddingInserts = chunks.map((chunk, i) => {
    const vectorId = `${file.id}_chunk_${i}`; // Generate ID
    const additionalMetadata = {
      chunk_index: i,
      chunk_text: chunk.text,
      ...(chunk.metadata || {})
    };

    // Store data to be returned
    insertedChunkData.push({ vectorId, metadata: additionalMetadata });

    // Use the provided db or trx instance
    return dbOrTrx.raw(`
      INSERT INTO ${PG_TABLE_NAMES.TEXT_EMBEDDINGS}
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

  return insertedChunkData; // Return the collected data
};


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
  return dbOrTrx(PG_TABLE_NAMES.COLLECTIONS) // Use dbOrTrx
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
  await dbOrTrx(PG_TABLE_NAMES.TEXT_EMBEDDINGS) // Use dbOrTrx
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
  return dbOrTrx(PG_TABLE_NAMES.FILES) // Use dbOrTrx
    .select('id') // Removed collection_id from select
    .where('id', fileId)
    .first();
 };

 /**
  * Creates a query runner instance bound to a specific Knex connection or transaction.
  * @param dbOrTrx - The Knex instance or transaction object.
 * @returns An object with methods to execute embedding-related queries.
 */
export const createEmbeddingQueryRunner = (dbOrTrx: Knex | Knex.Transaction) => {
  return {
    // Update the signature in the runner object as well
    insertTextEmbeddings: (
      file: DbFileType,
      chunks: { text: string; metadata?: Record<string, any> }[],
      embeddings: number[][]
    ): Promise<{ vectorId: string; metadata: Record<string, any> }[]> => // Updated return type here
      _insertTextEmbeddingsQuery(dbOrTrx, file, chunks, embeddings),

    // Removed the direct wrappers for findSimilarEmbeddings and findKeywordMatches
    // These are now handled by embedding.query.strategies.ts using the runner

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

   };
 };
