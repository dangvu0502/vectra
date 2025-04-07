import { openai } from '@ai-sdk/openai';
import { MDocument } from '@mastra/rag';
import { embedMany } from 'ai'; // Removed unused streamText import
import type { Knex } from 'knex';
import path from 'path'; // Import path module
import type { File as DbFileType } from './file.schema';
import { applyRRF, performKeywordSearch, performVectorSearch } from './embedding.query.strategies';
import { createEmbeddingQueryRunner, type MetadataFilter } from './file.embedding.queries';
// Import the metadata enrichment utility
import { enrichChunkMetadata } from './embedding.metadata.utils';

// Default chunking options
const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_OVERLAP_SIZE = 200;

// Interface defining the service's responsibilities
export interface IEmbeddingService {
  processFile(file: DbFileType): Promise<void>;
  deleteFileEmbeddings(fileId: string): Promise<void>;
  queryEmbeddings(params: {
    userId: string;
    queryText: string;
    limit: number;
    collectionId?: string;
    searchMode?: 'vector' | 'keyword' | 'hybrid'; // Added search mode
    // enableHeuristicReranking?: boolean; // REMOVED flag for optional reranking
    // Add optional filter parameters
    includeMetadataFilters?: MetadataFilter[];
    excludeMetadataFilters?: MetadataFilter[];
    maxDistance?: number; // Cosine distance threshold (0 to 2, lower is more similar)
  }): Promise<Array<{
    vector_id: string;
    file_id: string;
    metadata: Record<string, any>;
    distance?: number; // Cosine distance (optional now)
    rank?: number; // FTS rank (optional now)
    score?: number; // RRF score (optional now)
    // heuristic_score?: number; // REMOVED Optional score from reranking
  }>>;
  // Add method to get the underlying Knex instance if needed elsewhere
  getDbInstance(): Knex;
}

export class EmbeddingService implements IEmbeddingService {
  private static instance: EmbeddingService | null = null;
  private readonly db: Knex;
  private readonly options: { chunkSize: number; overlapSize: number };

  private constructor(
    db: Knex,
    options: { chunkSize?: number; overlapSize?: number } = {}
  ) {
    this.db = db;
    this.options = {
      chunkSize: options.chunkSize || DEFAULT_CHUNK_SIZE,
      overlapSize: options.overlapSize || DEFAULT_OVERLAP_SIZE,
    };
  }

  static getInstance(
    db: Knex,
    options: { chunkSize?: number; overlapSize?: number } = {}
  ): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService(db, options);
    }
    return EmbeddingService.instance;
  }

  static resetInstance(): void {
    EmbeddingService.instance = null;
  }

  // Add method to expose Knex instance if needed
  getDbInstance(): Knex {
    return this.db;
  }

  async processFile(file: DbFileType): Promise<void> {
    try {
      // Create document and chunk it using MDocument from @mastra/rag
      const doc = MDocument.fromText(file.content, {
        user_id: file.user_id,
        file_id: file.id,
        // collection_id: file.collection_id, // Removed - No longer directly on file
        filename: file.filename,
        created_at: file.created_at.toISOString(),
        ...(file.metadata || {}),
        chunkSize: this.options.chunkSize,
        overlapSize: this.options.overlapSize,
      });

      // 1. Chunk the document
      // Cast the result of chunk() to the expected type if necessary, or ensure compatibility
      // Assuming doc.chunk() returns an array compatible with the 'Chunk' type used in enrichChunkMetadata
      let chunks: Array<{ text: string; metadata?: Record<string, any> }> = await doc.chunk();
      if (!chunks || chunks.length === 0) {
        console.warn(`No chunks generated for file ${file.id}`);
        return;
      }

      // 2. Enrich chunk metadata using the utility function
      // The enrichChunkMetadata function now modifies chunks in place and returns the same array reference
      enrichChunkMetadata(file.content, chunks, file.filename);

      // 3. Generate embeddings using embedMany from 'ai'
      // Ensure the input to map is compatible; chunk.text should exist based on our Chunk type
      const texts = chunks.map(chunk => chunk.text);
      const { embeddings } = await embedMany({
        model: openai.embedding('text-embedding-3-small'),
        values: texts
      });

      if (!embeddings || embeddings.length !== chunks.length) {
        throw new Error(`Mismatch between chunks (${chunks.length}) and embeddings (${embeddings?.length || 0}) count.`);
      }

      // Begin transaction for database operations
      await this.db.transaction(async (trx) => {
        // Create a query runner scoped to this transaction
        const txRunner = createEmbeddingQueryRunner(trx);

        // Insert embeddings using the transaction runner
        // Pass the potentially modified chunks array
        await txRunner.insertTextEmbeddings(file, chunks, embeddings);

      // Removed logic to update collection knowledge index here.

      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error processing file ${file.id}: ${errorMessage}`);
      throw new Error(`Failed to process file ${file.id}: ${errorMessage}`);
    }
  }

  async deleteFileEmbeddings(fileId: string): Promise<void> {
    try {
      await this.db.transaction(async (trx) => {
        // Create a query runner scoped to this transaction
        const txRunner = createEmbeddingQueryRunner(trx);

        // Delete text embeddings using the transaction runner
        await txRunner.deleteTextEmbeddingsByFileId(fileId);


      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error deleting embeddings for file ${fileId}: ${errorMessage}`);
      throw new Error(`Failed to delete embeddings for file ${fileId}: ${errorMessage}`);
    }
  }

  // Update method signature to accept new filter parameters
  async queryEmbeddings({
    userId,
    queryText,
    limit,
    collectionId,
    includeMetadataFilters, // Added
    excludeMetadataFilters, // Added
    maxDistance,            // Added
    searchMode = 'vector',  // Added searchMode with default
    // enableHeuristicReranking = false, // REMOVED flag with default
  }: {
    userId: string;
    queryText: string;
    limit: number;
    collectionId?: string;
    searchMode?: 'vector' | 'keyword' | 'hybrid'; // Added search mode
    // enableHeuristicReranking?: boolean; // REMOVED flag for optional reranking
    includeMetadataFilters?: MetadataFilter[]; // Added
    excludeMetadataFilters?: MetadataFilter[]; // Added
    maxDistance?: number; // Added
  }): Promise<Array<{
    vector_id: string;
    file_id: string;
    metadata: Record<string, any>;
    distance?: number;
    rank?: number;
    score?: number;
    // heuristic_score?: number; // REMOVED Optional score from reranking
  }>> {
    try {
      // Create a query runner using the service's Knex instance
      const runner = createEmbeddingQueryRunner(this.db);
      const kRRF = 60; // RRF constant (could be moved to config)

      // Define type for results array
      let finalResults: Array<{
        vector_id: string;
        file_id: string;
        metadata: Record<string, any>;
        distance?: number;
        rank?: number;
        score?: number; // RRF score
      }> = [];

      // --- Execute Searches based on Mode using imported functions ---
      if (searchMode === 'vector') {
        finalResults = await performVectorSearch(
          runner, userId, queryText, limit, collectionId,
          includeMetadataFilters, excludeMetadataFilters, maxDistance
        );
      } else if (searchMode === 'keyword') {
        finalResults = await performKeywordSearch(
          runner, userId, queryText, limit, collectionId
          // Pass metadata filters if keyword search supports them in the future
        );
      } else if (searchMode === 'hybrid') {
        // Execute both searches in parallel using imported functions
        const [vectorResults, keywordResults] = await Promise.all([
          performVectorSearch(
            runner, userId, queryText, limit, collectionId,
            includeMetadataFilters, excludeMetadataFilters, maxDistance
          ),
          performKeywordSearch(
            runner, userId, queryText, limit, collectionId
            // Pass metadata filters if keyword search supports them
          )
        ]);

        // Apply RRF using the imported function
        finalResults = applyRRF(vectorResults, keywordResults, limit, kRRF);
      } else {
        throw new Error(`Invalid search mode: ${searchMode}`);
      }

      // --- REMOVED: Optional Heuristic Re-ranking ---

      return finalResults;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error querying embeddings for user ${userId}: ${errorMessage}`);
      // Consider throwing a more specific error type if needed
      throw new Error(`Failed to query embeddings: ${errorMessage}`);
    }
  }
}
