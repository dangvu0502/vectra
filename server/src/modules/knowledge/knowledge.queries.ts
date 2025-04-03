import { db } from '@/database/connection';
import type { Knex } from 'knex';
import { TEXT_EMBEDDINGS_TABLE, KNOWLEDGE_METADATA_INDEX_TABLE, MAX_RESULTS, MIN_SIMILARITY_THRESHOLD } from '@/config/constants';

// Define interfaces for query results for clarity
interface RawEntityResult {
  entity_id: string;
  entity_type: string;
  similarity_score: number;
}

interface RawEmbeddingResult {
  text: string;
  metadata: Record<string, any>;
  similarity_score: number;
}

/**
 * Finds relevant entities (collections and files) based on embedding similarity.
 * @param stringifiedEmbedding - The query embedding, stringified.
 * @param userId - The user ID to filter by.
 * @returns A promise resolving to the raw database rows.
 */
export const findRelevantEntitiesQuery = async (
  stringifiedEmbedding: string,
  userId: string
): Promise<RawEntityResult[]> => {
  const query = `
    SELECT
      entity_id,
      entity_type,
      1 - (embedding <=> ?::vector) as similarity_score
    FROM ${KNOWLEDGE_METADATA_INDEX_TABLE}
    WHERE user_id = ?
    ORDER BY similarity_score DESC
    LIMIT 10
  `;
  const params = [stringifiedEmbedding, userId];
  const result = await db.raw(query, params);
  return result.rows;
};

/**
 * Searches text embeddings filtered by a list of file IDs.
 * @param stringifiedEmbedding - The query embedding, stringified.
 * @param userId - The user ID.
 * @param relevantFileIds - An array of file IDs to filter by.
 * @returns A promise resolving to the raw database rows.
 */
export const searchByFileIdsQuery = async (
  stringifiedEmbedding: string,
  userId: string,
  relevantFileIds: string[]
): Promise<RawEmbeddingResult[]> => {
  if (relevantFileIds.length === 0) {
    return []; // Avoid running query with empty IN clause
  }

  const placeholders = relevantFileIds.map(() => '?').join(',');
  const query = `
    SELECT
      metadata->>'chunk_text' as text,
      metadata,
      1 - (embedding <=> ?::vector) as similarity_score
    FROM ${TEXT_EMBEDDINGS_TABLE}
    WHERE user_id = ?
    AND file_id IN (${placeholders})
    AND 1 - (embedding <=> ?::vector) > ?
    ORDER BY similarity_score DESC
    LIMIT ?
  `;
  const params = [
    stringifiedEmbedding,
    userId,
    ...relevantFileIds,
    stringifiedEmbedding, // Re-bind for the threshold check
    MIN_SIMILARITY_THRESHOLD,
    MAX_RESULTS
  ];

  const result = await db.raw(query, params);
  return result.rows;
};

/**
 * Searches text embeddings filtered by collection IDs.
 * @param stringifiedEmbedding - The query embedding, stringified.
 * @param userId - The user ID.
 * @param collectionIds - An array of collection IDs to filter by.
 * @returns A promise resolving to the raw database rows.
 */
export const searchByCollectionIdsQuery = async (
  stringifiedEmbedding: string,
  userId: string,
  collectionIds: string[]
): Promise<RawEmbeddingResult[]> => {
  if (collectionIds.length === 0) {
    console.warn('[KnowledgeQueries] searchByCollectionIdsQuery called with empty collectionIds array.');
    return []; // Avoid running query with empty IN clause
  }

  const placeholders = collectionIds.map(() => '?').join(',');
  const query = `
    SELECT
      metadata->>'chunk_text' as text,
      metadata,
      1 - (embedding <=> ?::vector) as similarity_score
    FROM ${TEXT_EMBEDDINGS_TABLE}
    WHERE user_id = ?
    AND collection_id IN (${placeholders})
    ORDER BY similarity_score DESC
    LIMIT ?
  `;
  const params = [
    stringifiedEmbedding,
    userId,
    ...collectionIds,
    MAX_RESULTS
  ];

  const result = await db.raw(query, params);
  return result.rows;
};

/**
 * Searches text embeddings filtered by a single collection ID.
 * @param stringifiedEmbedding - The query embedding, stringified.
 * @param userId - The user ID.
 * @param collectionId - The single collection ID to filter by.
 * @returns A promise resolving to the raw database rows.
 */
export const searchBySingleCollectionIdQuery = async (
  stringifiedEmbedding: string,
  userId: string,
  collectionId: string
): Promise<RawEmbeddingResult[]> => {
  const query = `
    SELECT
      metadata->>'chunk_text' as text,
      metadata,
      1 - (embedding <=> ?::vector) as similarity_score
    FROM ${TEXT_EMBEDDINGS_TABLE}
    WHERE user_id = ?
    AND collection_id = ?
    ORDER BY similarity_score DESC
    LIMIT ?
  `;
  const params = [
    stringifiedEmbedding,
    userId,
    collectionId,
    MAX_RESULTS
  ];

  const result = await db.raw(query, params);
  return result.rows;
};
