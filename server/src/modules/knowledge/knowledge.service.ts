import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { Knex } from 'knex';

const TEXT_EMBEDDINGS_TABLE = 'text_embeddings';
const KNOWLEDGE_METADATA_INDEX_TABLE = 'knowledge_metadata_index';
const MAX_RESULTS = 10;

interface SearchFilters {
  user_id: string;
  collection_id?: string;
}

interface SearchResult {
  text: string;
  metadata: Record<string, any>;
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
    
    try {
      // Generate embedding for the query
      const { embeddings } = await embedMany({
        model: openai.embedding('text-embedding-3-small'),
        values: [queryText]
      });
      
      const queryEmbedding = embeddings[0];
      
      // Stage 1: Search knowledge_metadata_index to find relevant collections
      let relevantCollectionIds: string[] = [];
      
      if (!filters.collection_id) {
        // Only perform metadata search if no specific collection is requested
        const metadataResults = await this.db.raw(`
          SELECT 
            entity_id, 
            entity_type,
            text_content,
            1 - (embedding <=> ?::vector) as similarity_score
          FROM ${KNOWLEDGE_METADATA_INDEX_TABLE}
          WHERE user_id = ?
          AND entity_type = 'collection'
          ORDER BY similarity_score DESC
          LIMIT 5
        `, [JSON.stringify(queryEmbedding), filters.user_id]);
        
        if (metadataResults.rows && metadataResults.rows.length > 0) {
          relevantCollectionIds = metadataResults.rows.map((row: any) => row.entity_id);
          console.log(`Found ${relevantCollectionIds.length} relevant collections`);
        }
      } else {
        // If collection_id is provided, use it directly
        relevantCollectionIds = [filters.collection_id];
      }
      
      // If no collections found and no specific collection requested, return empty results
      if (relevantCollectionIds.length === 0 && !filters.collection_id) {
        console.log('No relevant collections found');
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
      return results.rows.map((row: any) => ({
        text: row.text,
        metadata: row.metadata,
        score: row.similarity_score
      }));
      
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
