// Removed direct Ollama imports
import { MDocument, rerank } from '@mastra/rag'; // Import rerank
import { embedMany } from 'ai';
import type { Knex } from 'knex';
// Removed direct ollama provider import
import path from 'path';
import { applyRRF, performKeywordSearch, performVectorSearch } from './embedding.query.strategies';
import { createEmbeddingQueryRunner, type MetadataFilter } from './file.embedding.queries';
import type { File as DbFileType } from './file.schema';
import { cogito, llamaIndexOllamaCogito, nomicEmbedText } from '@/core/llm-adapter';
 
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
    // Add optional filter parameters
    includeMetadataFilters?: MetadataFilter[];
    excludeMetadataFilters?: MetadataFilter[];
    maxDistance?: number; // Cosine distance threshold (0 to 2, lower is more similar)
  }): Promise<Array<{
    vector_id: string;
    file_id: string;
    metadata: Record<string, any>;
    distance?: number; // Cosine distance (optional now)
    rank?: number; // FTS rank (optional now) - May be less relevant after rerank
    score?: number; // Combined score (RRF or rerank)
  }>>;
  getDbInstance(): Knex;
}

export class EmbeddingService implements IEmbeddingService {
  private static instance: EmbeddingService | null = null;
  private readonly db: Knex;

  private constructor(db: Knex) { // Removed options from constructor
    this.db = db;
  }

  static getInstance(db: Knex): EmbeddingService { // Removed options
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService(db);
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
      // 1. Determine File Type
      const fileType = path.extname(file.filename).toLowerCase();

      // 2. Prepare Initial Metadata
      const initialMetadata = {
        user_id: file.user_id,
        file_id: file.id,
        filename: file.filename,
        created_at: file.created_at.toISOString(),
        file_type: fileType, // Add file type here
        ...(file.metadata || {}),
      };
      const doc = MDocument.fromText(file.content, initialMetadata);

      // Define base parameters including the constant extraction config
      const baseChunkParams: any = {
        size: 256, // Default size, overridden below where needed
        overlap: 50, // Default overlap, overridden below where needed
        extract: {
          title: { llm: llamaIndexOllamaCogito, },     // Enable title extraction
          questions: { llm: llamaIndexOllamaCogito }, // Enable Q&A extraction
          keywords: { llm: llamaIndexOllamaCogito },  // Enable keyword extraction
        }
      };

      let chunkParams: any;

      // Determine strategy and specific overrides based on file type
      switch (fileType) {
        case '.md':
          chunkParams = {
            ...baseChunkParams,
            strategy: 'markdown',
            headers: [['##', 'section_title']],
            size: 512,
          };
          break;
        case '.html': case '.htm':
          chunkParams = {
            ...baseChunkParams,
            strategy: 'html',
            size: 512,
          };
          break;
        case '.json':
          // Note: 'maxSize' is specific to JSON strategy, 'size' might not apply
          chunkParams = {
            ...baseChunkParams,
            strategy: 'json',
            maxSize: 1024,
            // Remove size/overlap if they don't apply to JSON strategy
            size: undefined,
            overlap: undefined,
          };
          break;
        case '.tex':
          chunkParams = {
            ...baseChunkParams,
            strategy: 'latex',
            size: 512,
          };
          break;
        default: // Default to token strategy
          chunkParams = {
            ...baseChunkParams,
            strategy: 'token',
          };
          break;
      }


      // 4. Chunk the document with dynamic options
      let chunks: Array<{ text: string; metadata?: Record<string, any> }> = await doc.chunk(chunkParams);
      if (!chunks || chunks.length === 0) {
        console.warn(`No chunks generated for file ${file.id} using strategy ${chunkParams.strategy}`);
        return;
      }

      // 5. Generate embeddings using embedMany from 'ai'
      const texts = chunks.map(chunk => chunk.text);
      const { embeddings } = await embedMany({
        model: nomicEmbedText, // Use singleton provider
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
  }: {
    userId: string;
    queryText: string;
    limit: number;
    collectionId?: string;
    searchMode?: 'vector' | 'keyword' | 'hybrid'; // Added search mode
    includeMetadataFilters?: MetadataFilter[]; // Added
    excludeMetadataFilters?: MetadataFilter[]; // Added
    maxDistance?: number; // Added
  }): Promise<Array<{
    vector_id: string;
    file_id: string;
    metadata: Record<string, any>;
    distance?: number;
    rank?: number;
    score?: number; // Combined score (RRF or rerank)
  }>> {
    try {
      // Removed unused runner creation: const runner = createEmbeddingQueryRunner(this.db);
      const kRRF = 60;

      let initialResults: Array<{
        vector_id: string;
        file_id: string;
        metadata: Record<string, any>;
        distance?: number;
        rank?: number;
        score?: number; // RRF score if hybrid
      }> = [];

      // --- Execute Searches based on Mode ---
      if (searchMode === 'vector') {
        initialResults = await performVectorSearch(
          this.db, userId, queryText, limit, collectionId, // Pass this.db
          includeMetadataFilters, excludeMetadataFilters, maxDistance
        );
      } else if (searchMode === 'keyword') {
        initialResults = await performKeywordSearch(
          this.db, userId, queryText, limit, collectionId // Pass this.db
        );
      } else if (searchMode === 'hybrid') {
        const [vectorResults, keywordResults] = await Promise.all([
          performVectorSearch(
            this.db, userId, queryText, limit, collectionId, // Pass this.db
            includeMetadataFilters, excludeMetadataFilters, maxDistance
          ),
          performKeywordSearch(
            this.db, userId, queryText, limit, collectionId // Pass this.db
          )
        ]);
        initialResults = applyRRF(vectorResults, keywordResults, limit, kRRF);
      } else {
        throw new Error(`Invalid search mode: ${searchMode}`);
      }

      let finalResults = initialResults; // Default to initial results
      if (initialResults.length > 0) {
        // Ensure metadata.text exists for semantic scoring
        // Assuming performVectorSearch/performKeywordSearch return metadata including 'text'
        const resultsForReranking = initialResults.filter(r => r.metadata?.text);
        if (resultsForReranking.length !== initialResults.length) {
            console.warn("Some initial results missing metadata.text, excluding from reranking.");
        }

        if (resultsForReranking.length > 0) {
            try {
                const rerankedResults = await rerank(
                  resultsForReranking.map(r => ({ // Map to QueryResult format for rerank
                    id: r.vector_id,
                    score: r.distance !== undefined ? 1 - r.distance : (r.score || 0), // Use distance or RRF score
                    metadata: r.metadata,
                  })),
                  queryText,
                  cogito, // Use singleton instance for reranking
                  { topK: limit }
                );

                // Map reranked results back to the expected format, ensuring type compatibility
                finalResults = rerankedResults
                  .map(r => {
                    const fileId = r.result.metadata?.file_id;
                    // Ensure file_id is a string and metadata is an object
                    if (typeof fileId === 'string') {
                      return {
                        vector_id: r.result.id,
                        file_id: fileId,
                        metadata: r.result.metadata || {}, // Default to empty object if undefined
                        score: r.score,
                      };
                    }
                    return null; // Mark for filtering if file_id is not valid
                  })
                  .filter((result): result is { vector_id: string; file_id: string; metadata: Record<string, any>; score: number } => result !== null);

            } catch (rerankError) {
                console.error(`Reranking failed: ${rerankError instanceof Error ? rerankError.message : rerankError}. Returning initial results.`);
            }
        } else {
             console.warn("No results with metadata.text available for reranking.");
        }
      }
      return finalResults; // Return the potentially reranked results // Return initial results directly

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error querying embeddings for user ${userId}: ${errorMessage}`);
      // Consider throwing a more specific error type if needed
      throw new Error(`Failed to query embeddings: ${errorMessage}`);
    }
  }
}
