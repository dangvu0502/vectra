import { MDocument } from '@mastra/rag';
import { embedMany, streamText } from 'ai'; // Import streamText for entity extraction
import { openai } from '@ai-sdk/openai';
// Removed duplicate imports
import type { Knex } from 'knex';
import type { File as DbFileType } from './file.schema';
import path from 'path'; // Import path module
// Import the query runner factory and type
import { createEmbeddingQueryRunner, type MetadataFilter } from './file.embedding.queries';

// Default chunking options
const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_OVERLAP_SIZE = 200;

// Helper function to parse Markdown headings (## or more)
function parseHeadings(content: string): Array<{ title: string; index: number }> {
  const headings: Array<{ title: string; index: number }> = [];
  const headingRegex = /^(#{2,})\s+(.*)/gm; // Match lines starting with ##, ###, etc.
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    headings.push({
      title: match[2].trim(), // The heading text
      index: match.index,     // Starting character index of the heading line
    });
  }
  return headings;
}

import { embed } from 'ai'; // Import embed for single query embedding

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

      // 1. Parse headings before chunking
      const headings = parseHeadings(file.content);

      // 2. Chunk the document
      const chunks = await doc.chunk();
      if (!chunks || chunks.length === 0) {
        console.warn(`No chunks generated for file ${file.id}`);
        return;
      }

      // 3. Enrich chunk metadata - Basic enrichment only
      const fileType = path.extname(file.filename);
      let lastFoundIndex = -1;

      // Use a loop instead of forEach
      for (const chunk of chunks) {
        // Initialize metadata if it doesn't exist
        chunk.metadata = chunk.metadata || {};

        // Add file_type metadata
        chunk.metadata.file_type = fileType;

        // --- REMOVED: Simple Regex Code Block Detection ---
        // --- REMOVED: LLM Call for Entities (NER) ---
        // --- REMOVED: LLM Call for Chunk Summary ---

        // --- Find Section Title (Existing Logic) ---
        // Find approximate start index of chunk text in original content
        const chunkStartIndex = file.content.indexOf(chunk.text, lastFoundIndex + 1);
        if (chunkStartIndex !== -1) {
          lastFoundIndex = chunkStartIndex;
          // Find the last heading that occurred before this chunk's start index
          let relevantHeading = 'Unknown Section'; // Default
          for (let i = headings.length - 1; i >= 0; i--) {
            if (headings[i].index <= chunkStartIndex) {
              relevantHeading = headings[i].title;
              break;
            }
          }
          // Add section_title to metadata
          chunk.metadata.section_title = relevantHeading;
        } else {
           // Handle case where chunk text isn't found
           chunk.metadata.section_title = 'Unknown Section (Chunk text not found)';
           console.warn(`Could not find start index for chunk in file ${file.id}`);
        }
      } // End of loop through chunks

      // 4. Generate embeddings using embedMany from 'ai'
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

        // Removed call to deleteFileKnowledgeIndex

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
      const runner = createEmbeddingQueryRunner(this.db);
      const kRRF = 60; // Constant for RRF calculation

      // --- Vector Search Logic ---
      const performVectorSearch = async () => {
        const { embedding } = await embed({
          model: openai.embedding('text-embedding-3-small'),
          value: queryText,
        });
        if (!embedding) {
          throw new Error('Failed to generate embedding for query text.');
        }
        return runner.findSimilarEmbeddings(
          userId, embedding, limit, collectionId,
          includeMetadataFilters, excludeMetadataFilters, maxDistance
        );
      };

      // --- Keyword Search Logic ---
      const performKeywordSearch = async () => {
        return runner.findKeywordMatches(
          userId, queryText, limit, collectionId
          // TODO: Add metadata filters to keyword search if needed
        );
      };

      // --- Execute Searches based on Mode ---
      let finalResults: Array<{
        vector_id: string;
        file_id: string;
        metadata: Record<string, any>;
        distance?: number;
        rank?: number;
        score?: number; // RRF score
      }> = [];

      if (searchMode === 'vector') {
        finalResults = await performVectorSearch();
      } else if (searchMode === 'keyword') {
        finalResults = await performKeywordSearch();
      } else if (searchMode === 'hybrid') {
        // Execute both searches in parallel
        const [vectorResults, keywordResults] = await Promise.all([
          performVectorSearch(),
          performKeywordSearch()
        ]);

        // Implement RRF
        const rrfScores: { [key: string]: { score: number; data: any } } = {};

        // Process vector results (lower distance is better rank)
        vectorResults.forEach((result, index) => {
          const rank = index + 1;
          const score = 1 / (kRRF + rank);
          if (!rrfScores[result.vector_id]) {
            rrfScores[result.vector_id] = { score: 0, data: { ...result, distance: result.distance } }; // Keep distance
          }
          rrfScores[result.vector_id].score += score;
        });

        // Process keyword results (higher rank is better rank)
        keywordResults.forEach((result, index) => {
          const rank = index + 1; // Rank is directly from DB query order (desc)
          const score = 1 / (kRRF + rank);
           if (!rrfScores[result.vector_id]) {
             // If only found by keyword, store its data but initialize score
             rrfScores[result.vector_id] = { score: 0, data: { ...result, rank: result.rank } }; // Keep rank
           } else {
             // If already present from vector search, just add score and maybe rank info
             rrfScores[result.vector_id].data.rank = result.rank;
           }
           rrfScores[result.vector_id].score += score;
        });

        // Combine and sort
        const combined = Object.values(rrfScores).map(item => ({
          ...item.data, // Includes vector_id, file_id, metadata, distance?, rank?
          score: item.score // Add the final RRF score
        }));

        combined.sort((a, b) => b.score - a.score); // Sort by RRF score descending

        finalResults = combined.slice(0, limit);
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
