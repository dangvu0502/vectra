import type { Knex } from 'knex';
import type { File as DbFileType } from './file.model'; // Import File type

// Hardcoded table names (as they were in the service)
const TEXT_EMBEDDINGS_TABLE = 'text_embeddings';
const KNOWLEDGE_METADATA_INDEX_TABLE = 'knowledge_metadata_index';
const COLLECTIONS_TABLE = 'collections'; // Assuming this is the correct name
const FILES_TABLE = 'files'; // Needed for the check in delete

/**
 * Inserts multiple text embeddings in a transaction.
 * @param trx - Knex transaction object.
 * @param file - The file object associated with the embeddings.
 * @param chunks - Array of text chunks.
 * @param embeddings - Array of corresponding embeddings.
 */
export const insertTextEmbeddingsQuery = async (
  trx: Knex.Transaction,
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

    // Use Knex's raw query builder within the transaction
    return trx.raw(`
      INSERT INTO ${TEXT_EMBEDDINGS_TABLE}
      (vector_id, user_id, file_id, collection_id, embedding, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?::vector, ?, NOW(), NOW())
    `, [
      vectorId,
      file.user_id,
      file.id,
      file.collection_id,
      JSON.stringify(embeddings[i]), // Ensure embedding is stringified
      JSON.stringify(additionalMetadata) // Ensure metadata is stringified
    ]);
  });

  await Promise.all(textEmbeddingInserts);
};

/**
 * Upserts a knowledge metadata index entry for a file.
 * @param trx - Knex transaction object.
 * @param userId - The user ID.
 * @param fileId - The file ID.
 * @param textContent - The text content for the index.
 * @param embedding - The embedding vector.
 */
export const upsertFileKnowledgeIndexQuery = async (
  trx: Knex.Transaction,
  userId: string,
  fileId: string,
  textContent: string,
  embedding: number[]
): Promise<void> => {
  const upsertQuery = `
    INSERT INTO ${KNOWLEDGE_METADATA_INDEX_TABLE}
    (user_id, text_content, embedding, entity_type, entity_id, created_at, updated_at)
    VALUES (?, ?, ?::vector, ?, ?, NOW(), NOW())
    ON CONFLICT (user_id, entity_type, entity_id)
    DO UPDATE SET
      text_content = EXCLUDED.text_content,
      embedding = EXCLUDED.embedding,
      updated_at = NOW()
  `;
  const params = [
    userId,
    textContent,
    JSON.stringify(embedding), // Ensure embedding is stringified
    'file',
    fileId
  ];
  await trx.raw(upsertQuery, params);
};

/**
 * Finds a collection by its ID within a transaction.
 * @param trx - Knex transaction object.
 * @param collectionId - The collection ID.
 * @returns The collection object or undefined.
 */
export const findCollectionByIdQuery = async (
  trx: Knex.Transaction,
  collectionId: string
): Promise<{ id: string; name: string; description?: string } | undefined> => {
  return trx(COLLECTIONS_TABLE)
    .where('id', collectionId)
    .first();
};


/**
 * Upserts a knowledge metadata index entry for a collection.
 * @param trx - Knex transaction object.
 * @param userId - The user ID.
 * @param collectionId - The collection ID.
 * @param textContent - The text content for the index.
 * @param embedding - The embedding vector.
 */
export const upsertCollectionKnowledgeIndexQuery = async (
  trx: Knex.Transaction,
  userId: string,
  collectionId: string,
  textContent: string,
  embedding: number[]
): Promise<void> => {
  const upsertQuery = `
    INSERT INTO ${KNOWLEDGE_METADATA_INDEX_TABLE}
    (user_id, text_content, embedding, entity_type, entity_id, created_at, updated_at)
    VALUES (?, ?, ?::vector, ?, ?, NOW(), NOW())
    ON CONFLICT (user_id, entity_type, entity_id)
    DO UPDATE SET
      text_content = EXCLUDED.text_content,
      embedding = EXCLUDED.embedding,
      updated_at = NOW()
  `;
  const params = [
    userId,
    textContent,
    JSON.stringify(embedding), // Ensure embedding is stringified
    'collection',
    collectionId
  ];
  await trx.raw(upsertQuery, params);
};


/**
 * Deletes text embeddings associated with a file ID within a transaction.
 * @param trx - Knex transaction object.
 * @param fileId - The file ID.
 */
export const deleteTextEmbeddingsByFileIdQuery = async (
  trx: Knex.Transaction,
  fileId: string
): Promise<void> => {
  await trx(TEXT_EMBEDDINGS_TABLE)
    .where('file_id', fileId)
    .delete();
};

/**
 * Deletes the knowledge metadata index entry for a specific file within a transaction.
 * @param trx - Knex transaction object.
 * @param fileId - The file ID.
 */
export const deleteFileKnowledgeIndexQuery = async (
  trx: Knex.Transaction,
  fileId: string
): Promise<void> => {
  await trx(KNOWLEDGE_METADATA_INDEX_TABLE)
    .where({
      entity_type: 'file',
      entity_id: fileId
    })
    .delete();
};

/**
 * Finds a file by its ID within a transaction (minimal select).
 * Used to check collection association during deletion.
 * @param trx - Knex transaction object.
 * @param fileId - The file ID.
 * @returns The file object with id and collection_id, or undefined.
 */
export const findFileForDeleteCheckQuery = async (
  trx: Knex.Transaction,
  fileId: string
): Promise<{ id: string; collection_id: string | null } | undefined> => {
  return trx(FILES_TABLE)
    .select('id', 'collection_id')
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
export const countRemainingFilesInCollectionQuery = async (
  trx: Knex.Transaction,
  collectionId: string,
  excludeFileId: string
): Promise<number> => {
  const result = await trx(FILES_TABLE)
    .where('collection_id', collectionId)
    .whereNot('id', excludeFileId)
    .count('id as count')
    .first();
  return result ? Number(result.count) : 0;
};

/**
 * Deletes the knowledge metadata index entry for a specific collection within a transaction.
 * @param trx - Knex transaction object.
 * @param collectionId - The collection ID.
 */
export const deleteCollectionKnowledgeIndexQuery = async (
  trx: Knex.Transaction,
  collectionId: string
): Promise<void> => {
  await trx(KNOWLEDGE_METADATA_INDEX_TABLE)
    .where({
      entity_type: 'collection',
      entity_id: collectionId
    })
    .delete();
};
