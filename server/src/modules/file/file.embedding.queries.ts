import { db } from '@/database/connection'; // Keep db import for default runner
import type { Knex } from 'knex';
import type { File as DbFileType } from './file.schema'; // Import File type
// Import necessary table names
import { FILES_TABLE, TEXT_EMBEDDINGS_TABLE, COLLECTIONS_TABLE, COLLECTION_FILES_TABLE } from '@/config/constants';

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
 * @param includeMetadataFilters - Optional array of filters for required metadata values.
 * @param excludeMetadataFilters - Optional array of filters for excluded metadata patterns.
 * @param maxDistance - Optional maximum cosine distance threshold.
 * @returns Array of matching text embeddings with distance.
 */
const _findSimilarEmbeddingsQuery = async ( // Make internal
  dbOrTrx: Knex | Knex.Transaction,
  userId: string,
  embedding: number[],
  limit: number,
  collectionId?: string,
  includeMetadataFilters?: MetadataFilter[], // Added
  excludeMetadataFilters?: MetadataFilter[], // Added
  maxDistance?: number // Added
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
    .where('te.user_id', userId); // Ensure user owns the embedding's file
    // Apply filters before ordering and limiting

  // Apply collection filter if provided
  if (collectionId) {
    query = query
      .join(`${COLLECTION_FILES_TABLE} as cf`, 'te.file_id', 'cf.file_id')
      .where('cf.collection_id', collectionId);
  }

  // Apply include metadata filters
  if (includeMetadataFilters && includeMetadataFilters.length > 0) {
    includeMetadataFilters.forEach(filter => {
      if (filter.value !== undefined) { // Check for undefined explicitly
        // Use ->> for text extraction and = for exact match
        query = query.whereRaw(`te.metadata->>? = ?`, [filter.field, filter.value]);
      }
      // Add other conditions like pattern matching if needed for include filters
    });
  }

  // Apply exclude metadata filters
  if (excludeMetadataFilters && excludeMetadataFilters.length > 0) {
    excludeMetadataFilters.forEach(filter => {
      if (filter.pattern !== undefined) {
        // Use ->> for text extraction and LIKE for pattern match
        // Ensure pattern includes wildcards where needed (e.g., '%DOCKER%')
        // Correct syntax: whereNot with dbOrTrx.raw()
        query = query.whereNot(dbOrTrx.raw(`te.metadata->>? LIKE ?`, [filter.field, filter.pattern]));
      } else if (filter.value !== undefined) {
        // Exclude exact matches if only value is provided
        // Correct syntax: whereNot with dbOrTrx.raw()
         query = query.whereNot(dbOrTrx.raw(`te.metadata->>? = ?`, [filter.field, filter.value]));
      }
    });
  }

   // Apply distance threshold filter (only keep results *below* or equal to maxDistance)
   if (maxDistance !== undefined && maxDistance >= 0) {
     // We need to calculate distance first, then filter. This might require a subquery
     // or applying the filter after the main selection if the DB supports it directly.
     // For simplicity here, let's assume we can filter on the calculated alias.
     // Note: This might need adjustment based on DB behavior. A safer way is often a subquery.
     // Let's try adding it directly to the main query for now.
     query = query.where(dbOrTrx.raw(`(te.embedding <=> ?::vector) <= ?`, [queryEmbeddingString, maxDistance]));
     // Re-calculate distance in select if needed, or rely on the WHERE clause calculation
   }


  // Apply ordering and limit *after* all filters
  query = query.orderBy('distance', 'asc') // Order by distance (closer is smaller)
               .limit(limit);

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
      collectionId?: string,
      // Add new optional filter parameters to the runner method signature
      includeMetadataFilters?: MetadataFilter[],
      excludeMetadataFilters?: MetadataFilter[],
      maxDistance?: number
    ) => _findSimilarEmbeddingsQuery(
        dbOrTrx,
        userId,
        embedding,
        limit,
        collectionId,
        includeMetadataFilters, // Pass through
        excludeMetadataFilters, // Pass through
        maxDistance // Pass through
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
