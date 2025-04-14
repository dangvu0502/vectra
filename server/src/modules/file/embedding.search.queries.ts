import { PG_TABLE_NAMES } from '@/database/constants'; // Import PG constants
// Removed incorrect import: import { COLLECTION_FILES_TABLE, TEXT_EMBEDDINGS_TABLE } from '@/config/constants';
import type { Knex } from 'knex';
import type { MetadataFilter } from './file.embedding.queries'; // Import shared type

// Type for the result items (consistent with the original file)
type SearchResultItem = {
  vector_id: string;
  file_id: string;
  metadata: Record<string, any>;
  distance?: number; // Cosine distance for vector search
  rank?: number;     // FTS rank for keyword search
};

/**
 * Performs vector similarity search on text embeddings.
 */
export const findSimilarEmbeddings = async ( // Renamed from _findSimilarEmbeddingsInternal
  dbOrTrx: Knex | Knex.Transaction,
  userId: string,
  embedding: number[],
  limit: number,
  collectionId?: string,
  includeMetadataFilters?: MetadataFilter[],
  excludeMetadataFilters?: MetadataFilter[],
  maxDistance?: number
): Promise<Array<SearchResultItem & { distance: number }>> => { // Ensure distance is non-optional here
  const queryEmbeddingString = JSON.stringify(embedding);

  let query = dbOrTrx(`${PG_TABLE_NAMES.TEXT_EMBEDDINGS} as te`)
    .select(
      'te.vector_id',
      'te.file_id',
      'te.metadata',
      dbOrTrx.raw(`te.embedding <=> ?::vector AS distance`, [queryEmbeddingString])
    )
    .where('te.user_id', userId);

  if (collectionId) {
    query = query
      .join(`${PG_TABLE_NAMES.COLLECTION_FILES} as cf`, 'te.file_id', 'cf.file_id')
      .where('cf.collection_id', collectionId);
  }

  if (includeMetadataFilters && includeMetadataFilters.length > 0) {
    includeMetadataFilters.forEach(filter => {
      if (filter.value !== undefined) {
        query = query.whereRaw(`te.metadata->>? = ?`, [filter.field, filter.value]);
      }
    });
  }

  if (excludeMetadataFilters && excludeMetadataFilters.length > 0) {
    excludeMetadataFilters.forEach(filter => {
      if (filter.pattern !== undefined) {
        query = query.whereNot(dbOrTrx.raw(`te.metadata->>? LIKE ?`, [filter.field, filter.pattern]));
      } else if (filter.value !== undefined) {
         query = query.whereNot(dbOrTrx.raw(`te.metadata->>? = ?`, [filter.field, filter.value]));
      }
    });
  }

   if (maxDistance !== undefined && maxDistance >= 0) {
     query = query.where(dbOrTrx.raw(`(te.embedding <=> ?::vector) <= ?`, [queryEmbeddingString, maxDistance]));
   }

  query = query.orderBy('distance', 'asc').limit(limit);

  // Explicitly cast the result type if needed, or ensure the select matches
  const results = await query;
  return results as Array<SearchResultItem & { distance: number }>;
};


/**
 * Performs Full-Text Search (FTS) on text embeddings.
 */
export const findKeywordMatches = async ( // Renamed from _findKeywordMatchesInternal
  dbOrTrx: Knex | Knex.Transaction,
  userId: string,
  queryText: string,
  limit: number,
  collectionId?: string,
  ftsConfig: string = 'english'
): Promise<Array<SearchResultItem & { rank: number }>> => { // Ensure rank is non-optional here
  const tsQuery = dbOrTrx.raw(`websearch_to_tsquery(?, ?)`, [ftsConfig, queryText]);

  let query = dbOrTrx(`${PG_TABLE_NAMES.TEXT_EMBEDDINGS} as te`)
    .select(
      'te.vector_id',
      'te.file_id',
      'te.metadata',
      dbOrTrx.raw(`ts_rank_cd(te.fts_vector, ?) AS rank`, [tsQuery])
    )
    .where('te.user_id', userId)
    .whereRaw(`te.fts_vector @@ ?`, [tsQuery]);

  if (collectionId) {
    query = query
      .join(`${PG_TABLE_NAMES.COLLECTION_FILES} as cf`, 'te.file_id', 'cf.file_id')
      .where('cf.collection_id', collectionId);
  }

  query = query.orderBy('rank', 'desc').limit(limit);

  // Explicitly cast the result type if needed, or ensure the select matches
  const results = await query;
  return results as Array<SearchResultItem & { rank: number }>;
};
