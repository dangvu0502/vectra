import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { Knex } from 'knex';

const TEXT_EMBEDDINGS_TABLE = 'text_embeddings';
const KNOWLEDGE_METADATA_INDEX_TABLE = 'knowledge_metadata_index';
const MAX_RESULTS = 10;
const MIN_SIMILARITY_THRESHOLD = 0.6; // Minimum similarity score to consider a result relevant
const ENABLE_FALLBACK_SEARCH = true; // Whether to perform fallback search when no collections found

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

  /**
   * Two-stage knowledge base search:
   * 1. First searches the knowledge_metadata_index to find relevant collections
   * 2. Then searches the text_embeddings using the identified collections
   */
  async searchKnowledgeBase(
    queryText: string,
    filters: SearchFilters
  ): Promise<SearchResult[]> {
    console.log(`Searching knowledge base for: "${queryText}"`);

    const startTime = Date.now();

    try {
      // Generate embedding for the query
      const embeddingStartTime = Date.now();
      const { embeddings } = await embedMany({
        model: openai.embedding('text-embedding-3-small'),
        values: [queryText]
      });

      const queryEmbedding = embeddings[0];
      console.log(`Embedding generation took ${Date.now() - embeddingStartTime}ms`);

      // Stage 1: Search knowledge_metadata_index to find relevant collections
      const metadataSearchStartTime = Date.now();
      let relevantCollectionIds: string[] = [];

      console.log({
        user_id: filters.user_id,
        collection_id: filters.collection_id,
        skip_collection_search: filters.skip_collection_search
      });

      // Skip collection search if requested or if a specific collection is provided
      if (!filters.collection_id && !filters.skip_collection_search) {
        // Only perform metadata search if no specific collection is requested and not skipped
        const metadataResults = await this.db.raw(`
          SELECT 
            entity_id, 
            entity_type,
            text_content,
            1 - (embedding <=> ?::vector) as similarity_score
          FROM ${KNOWLEDGE_METADATA_INDEX_TABLE}
          WHERE user_id = ?
          ORDER BY similarity_score DESC
          LIMIT 10
        `, [JSON.stringify(queryEmbedding), filters.user_id]);

        if (metadataResults.rows && metadataResults.rows.length > 0) {


          // Process both collections and files
          const relevantEntities = metadataResults.rows.map((row: any): RelevantEntity => ({
            id: row.entity_id,
            type: row.entity_type,
            score: row.similarity_score
          }));

          // Extract collection IDs
          relevantCollectionIds = relevantEntities
            .filter((entity: RelevantEntity) => entity.type === 'collection')
            .map((entity: RelevantEntity) => entity.id);

          // Extract file IDs for direct search
          const relevantFileIds = relevantEntities
            .filter((entity: RelevantEntity) => entity.type === 'file')
            .map((entity: RelevantEntity) => entity.id);

          console.log(`Found ${relevantCollectionIds.length} relevant collections and ${relevantFileIds.length} relevant files`);

          // If we found relevant files but no collections, we can search those files directly
          if (relevantCollectionIds.length === 0 && relevantFileIds.length > 0) {
            console.log(`Searching ${relevantFileIds.length} relevant files directly`);

            const fileQuery = await this.db.raw(`
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
            `, [
              JSON.stringify(queryEmbedding),
              filters.user_id,
              ...relevantFileIds,
              JSON.stringify(queryEmbedding),
              MAX_RESULTS
            ]);

            if (fileQuery.rows && fileQuery.rows.length > 0) {
              console.log(`Found ${fileQuery.rows.length} results from relevant files`);
              return fileQuery.rows.map((row: any) => ({
                text: row.text,
                metadata: row.metadata,
                score: row.similarity_score
              }));
            }
          }
        }
      } else if (filters.collection_id) {
        // If collection_id is provided, use it directly
        relevantCollectionIds = [filters.collection_id];
      }

      console.log(`Metadata search took ${Date.now() - metadataSearchStartTime}ms`);

      // If no collections found and no specific collection requested, perform fallback search
      if ((relevantCollectionIds.length === 0 && !filters.collection_id) || filters.skip_collection_search) {
        if (filters.skip_collection_search) {
          console.log('Collection search skipped, performing direct search');
        } else {
          console.log('No relevant collections found, performing fallback search');
        }

        if (ENABLE_FALLBACK_SEARCH) {
          // Add fallback search on all text embeddings with a similarity threshold
          const fallbackSearchStartTime = Date.now();

          const fallbackQuery = await this.db.raw(`
            SELECT 
              metadata->>'chunk_text' as text,
              metadata,
              1 - (embedding <=> ?::vector) as similarity_score
            FROM ${TEXT_EMBEDDINGS_TABLE}
            WHERE user_id = ?
            AND 1 - (embedding <=> ?::vector) > ${MIN_SIMILARITY_THRESHOLD}
            ORDER BY similarity_score DESC
            LIMIT ?
          `, [
            JSON.stringify(queryEmbedding),
            filters.user_id,
            JSON.stringify(queryEmbedding),
            MAX_RESULTS
          ]);

          console.log(`Fallback search took ${Date.now() - fallbackSearchStartTime}ms`);

          if (fallbackQuery.rows && fallbackQuery.rows.length > 0) {
            console.log(`Fallback search found ${fallbackQuery.rows.length} results`);
            return fallbackQuery.rows.map((row: any) => ({
              text: row.text,
              metadata: row.metadata,
              score: row.similarity_score
            }));
          }
        }

        return [];
      }

      // Stage 2: Search text_embeddings using the identified collections or specific collection
      let query = this.db.raw(`
        SELECT 
          metadata->>'chunk_text' as text,
          metadata,
          1 - (embedding <=> ?::vector) as similarity_score
        FROM ${TEXT_EMBEDDINGS_TABLE}
        WHERE user_id = ?
      `, [JSON.stringify(queryEmbedding), filters.user_id]);

      // Add collection filter if we have relevant collections
      if (relevantCollectionIds.length > 0) {
        query = this.db.raw(`
          SELECT 
            metadata->>'chunk_text' as text,
            metadata,
            1 - (embedding <=> ?::vector) as similarity_score
          FROM ${TEXT_EMBEDDINGS_TABLE}
          WHERE user_id = ?
          AND collection_id IN (${relevantCollectionIds.map(() => '?').join(',')})
          ORDER BY similarity_score DESC
          LIMIT ?
        `, [
          JSON.stringify(queryEmbedding),
          filters.user_id,
          ...relevantCollectionIds,
          MAX_RESULTS
        ]);
      } else if (filters.collection_id) {
        // If specific collection_id was provided but not found in relevant collections
        query = this.db.raw(`
          SELECT 
            metadata->>'chunk_text' as text,
            metadata,
            1 - (embedding <=> ?::vector) as similarity_score
          FROM ${TEXT_EMBEDDINGS_TABLE}
          WHERE user_id = ?
          AND collection_id = ?
          ORDER BY similarity_score DESC
          LIMIT ?
        `, [
          JSON.stringify(queryEmbedding),
          filters.user_id,
          filters.collection_id,
          MAX_RESULTS
        ]);
      }

      const results = await query;

      if (!results.rows || results.rows.length === 0) {
        console.log('No matching text embeddings found');
        return [];
      }

      console.log(`Found ${results.rows.length} matching text embeddings`);

      // Format results
      const formattedResults = results.rows.map((row: any) => ({
        text: row.text,
        metadata: row.metadata,
        score: row.similarity_score
      }));

      console.log(`Total search process took ${Date.now() - startTime}ms`);

      return formattedResults;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error searching knowledge base: ${errorMessage}`);
      throw new Error(`Failed to search knowledge base: ${errorMessage}`);
    }
  }
}

// Import db in the file where this is used and initialize:
// import { db } from '@/database/connection';
// export const knowledgeService = KnowledgeService.getInstance(db);
