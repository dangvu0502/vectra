import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { Knex } from 'knex';

const TEXT_EMBEDDINGS_TABLE = 'text_embeddings';
const KNOWLEDGE_METADATA_INDEX_TABLE = 'knowledge_metadata_index';
const MAX_RESULTS = 10;
const MIN_SIMILARITY_THRESHOLD = 0.2; // Set threshold to 0.2 as requested
// Fallback search constant removed

interface SearchFilters {
  user_id: string;
  collection_id?: string;
  skip_collection_search?: boolean; // Option to skip the collection search stage
}

interface SearchResult {
  text: string;
  metadata: Record<string, any>;
  score: number;
}

interface RelevantEntity {
  id: string;
  type: string;
  score: number;
}

interface RelevantEntitiesResult {
  relevantCollectionIds: string[];
  relevantFileIds: string[];
}

export class KnowledgeService {
  private static instance: KnowledgeService | null = null;
  private readonly db: Knex;

  private constructor(db: Knex) {
    this.db = db;
  }

  static getInstance(db: Knex): KnowledgeService {
    if (!KnowledgeService.instance) {
      KnowledgeService.instance = new KnowledgeService(db);
    }
    return KnowledgeService.instance;
  }

  static resetInstance(): void {
    KnowledgeService.instance = null;
  }

  // Helper to format results consistently
  private _formatResults(rows: any[]): SearchResult[] {
    if (!rows || rows.length === 0) {
      return [];
    }
    return rows.map((row: any) => ({
      text: row.text,
      metadata: row.metadata,
      score: row.similarity_score
    }));
  }

  // Stage 1: Find relevant collections and files from metadata index
  private async _findRelevantEntities(
    stringifiedEmbedding: string,
    filters: SearchFilters
  ): Promise<RelevantEntitiesResult> {
    // const metadataSearchStartTime = Date.now();
    const metadataQuery = `
      SELECT
        entity_id,
        entity_type,
        1 - (embedding <=> ?::vector) as similarity_score
      FROM ${KNOWLEDGE_METADATA_INDEX_TABLE}
      WHERE user_id = ?
      ORDER BY similarity_score DESC
      LIMIT 10
    `;
    const metadataParams = [stringifiedEmbedding, filters.user_id];
    const metadataResults = await this.db.raw(metadataQuery, metadataParams);

    let relevantCollectionIds: string[] = [];
    let relevantFileIds: string[] = [];

    if (metadataResults.rows && metadataResults.rows.length > 0) {
      const relevantEntities = metadataResults.rows.map((row: any): RelevantEntity => ({
        id: row.entity_id,
        type: row.entity_type,
        score: row.similarity_score
      }));

      relevantCollectionIds = relevantEntities
        .filter((entity: RelevantEntity) => entity.type === 'collection')
        .map((entity: RelevantEntity) => entity.id);

      relevantFileIds = relevantEntities
        .filter((entity: RelevantEntity) => entity.type === 'file')
        .map((entity: RelevantEntity) => entity.id);
    }
    // console.log(`[KnowledgeService] Metadata search took ${Date.now() - metadataSearchStartTime}ms`);
    return { relevantCollectionIds, relevantFileIds };
  }

  // Search directly by file IDs if metadata search found files but no collections
  private async _searchByFileIds(
    stringifiedEmbedding: string,
    filters: SearchFilters,
    relevantFileIds: string[]
  ): Promise<SearchResult[] | null> {
    // const fileSearchStartTime = Date.now();
    const fileQuerySql = `
      SELECT
        metadata->>'chunk_text' as text,
        metadata,
        1 - (embedding <=> ?::vector) as similarity_score
      FROM ${TEXT_EMBEDDINGS_TABLE}
      WHERE user_id = ?
      AND file_id IN (${relevantFileIds.map(() => '?').join(',')})
      AND 1 - (embedding <=> ?::vector) > ${MIN_SIMILARITY_THRESHOLD}
      ORDER BY similarity_score DESC
      LIMIT ?
    `;
    const fileQueryParams = [
      stringifiedEmbedding,
      filters.user_id,
      ...relevantFileIds,
      stringifiedEmbedding, // Re-bind for the threshold check
      MAX_RESULTS
    ];

    const fileQuery = await this.db.raw(fileQuerySql, fileQueryParams);
    // console.log(`[KnowledgeService] File search took ${Date.now() - fileSearchStartTime}ms`);

    if (fileQuery.rows && fileQuery.rows.length > 0) {
      return this._formatResults(fileQuery.rows);
    }
    return null;
  }

  // Stage 2: Search text embeddings filtered by collection IDs
  private async _searchByCollectionIds(
    stringifiedEmbedding: string,
    filters: SearchFilters,
    relevantCollectionIds: string[]
  ): Promise<SearchResult[] | null> {
    // const collectionSearchStartTime = Date.now();
    let collectionFilterClause = '';
    let queryParams: string[] = [stringifiedEmbedding, filters.user_id];

    if (relevantCollectionIds.length > 0) {
      collectionFilterClause = `AND collection_id IN (${relevantCollectionIds.map(() => '?').join(',')})`;
      queryParams.push(...relevantCollectionIds);
    } else if (filters.collection_id) {
      collectionFilterClause = `AND collection_id = ?`;
      queryParams.push(filters.collection_id);
    } else {
      console.warn('[KnowledgeService] Attempted to search by collection IDs, but no IDs were provided.');
      return null;
    }

    const querySql = `
      SELECT
        metadata->>'chunk_text' as text,
        metadata,
        1 - (embedding <=> ?::vector) as similarity_score
      FROM ${TEXT_EMBEDDINGS_TABLE}
      WHERE user_id = ?
      ${collectionFilterClause}
      ORDER BY similarity_score DESC
      LIMIT ${MAX_RESULTS} 
    `;

    const queryResult = await this.db.raw(querySql, queryParams);
    // console.log(`[KnowledgeService] Collection search took ${Date.now() - collectionSearchStartTime}ms`);

    if (queryResult.rows && queryResult.rows.length > 0) {
      return this._formatResults(queryResult.rows);
    }
    return null;
  }


  /**
   * Knowledge base search:
   * 1. Optionally searches the knowledge_metadata_index to find relevant collections/files
   * 2. Then searches the text_embeddings using the identified collections/files.
   */
  async searchKnowledgeBase(
    queryText: string,
    filters: SearchFilters
  ): Promise<SearchResult[]> {
    // const startTime = Date.now();
    try {
      // Generate embedding for the query
      // const embeddingStartTime = Date.now();
      const { embeddings } = await embedMany({
        model: openai.embedding('text-embedding-3-small'),
        values: [queryText]
      });
      const queryEmbedding = embeddings[0];
      const stringifiedEmbedding = JSON.stringify(queryEmbedding);
      // console.log(`[KnowledgeService] Embedding generation took ${Date.now() - embeddingStartTime}ms`);

      let relevantCollectionIds: string[] = [];
      let searchResults: SearchResult[] | null = null;

      // --- Stage 1: Find Relevant Entities (Collections/Files) ---
      if (!filters.collection_id && !filters.skip_collection_search) {
        const { relevantCollectionIds: foundCollections, relevantFileIds: foundFiles } =
          await this._findRelevantEntities(stringifiedEmbedding, filters);

        relevantCollectionIds = foundCollections;

        // If only files found, search them directly and return if results exist
        if (foundCollections.length === 0 && foundFiles.length > 0) {
          searchResults = await this._searchByFileIds(stringifiedEmbedding, filters, foundFiles);
          if (searchResults) {
            // console.log(`[KnowledgeService] Search completed via direct file search. Total time: ${Date.now() - startTime}ms`);
            return searchResults;
          }
        }
      } else if (filters.collection_id) {
        relevantCollectionIds = [filters.collection_id];
      }

      // --- Stage 2: Search By Collection IDs (if applicable) ---
      const shouldSearchCollections = relevantCollectionIds.length > 0 || filters.collection_id;

      if (shouldSearchCollections) {
        searchResults = await this._searchByCollectionIds(stringifiedEmbedding, filters, relevantCollectionIds);
      } else {
         // If no relevant collections found/provided and direct file search didn't yield results (or wasn't applicable)
         searchResults = null;
      }

      // console.log(`[KnowledgeService] Search completed. Total time: ${Date.now() - startTime}ms`);
      return searchResults || []; // Return results or empty array

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[KnowledgeService] Error searching knowledge base: ${errorMessage}`, error);
      throw new Error(`Failed to search knowledge base: ${errorMessage}`);
    }
  }
}

// Import db in the file where this is used and initialize:
// import { db } from '@/database/connection';
// export const knowledgeService = KnowledgeService.getInstance(db);
