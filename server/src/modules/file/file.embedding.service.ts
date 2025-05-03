// Removed direct Ollama imports
import { MDocument } from '@mastra/rag'; // Import rerank
import { embedMany } from 'ai';
import type { Knex } from 'knex';
// Removed direct ollama provider import
import { languageModel, embeddingModel } from '@/connectors/llm/adapter'; // Updated path
// Removed aql, arangoDbClient, getEdgesCollection, getNodesCollection imports
import path from 'path';
import { arangoDbService } from '../arangodb/arangodb.service.js'; // Import the ArangoDB service
// Import query strategies (performReranking removed as it's commented out)
import { applyRRF, performKeywordSearch, performVectorSearch } from './embedding.query.strategies';
import { getChunkingParams } from './chunking.strategies.js'; // Import chunking strategy logic
import { createEmbeddingQueryRunner, type MetadataFilter } from './file.embedding.queries';
import type { File as DbFileType } from './file.schema';
// Removed MDocument and rerank imports as they are no longer directly used here
// Removed duplicate imports below

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
    // --- Graph Search Parameters ---
    enableGraphSearch?: boolean; // Default false
    graphDepth?: number; // Default 1
    graphTopN?: number; // Default 3 (how many vector results to use as start nodes)
    graphRelationshipTypes?: string[]; // Optional: Filter edge types
    graphTraversalDirection?: 'any' | 'inbound' | 'outbound'; // Add direction parameter
  }): Promise<Array<{
    vector_id: string; // Corresponds to chunk vectra_id in the graph
    file_id: string;
    metadata: Record<string, any>;
    distance?: number; // Cosine distance (optional now)
    rank?: number; // FTS rank (optional now) - May be less relevant after rerank
    score?: number; // Combined score (RRF or rerank)
    // Add synthesized answer field
    synthesized_answer?: string;
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

      // 3. Determine Chunking Strategy using the extracted function
      // Pass defaultBaseChunkParams or customize if needed
      const chunkParams = getChunkingParams(fileType /*, optionalCustomBaseParams */);
      console.log(`Using chunking strategy: ${chunkParams.strategy} for file ${file.id}`);


      // 4. Chunk the document with dynamic options
      let chunks: Array<{ text: string; metadata?: Record<string, any> }> = await doc.chunk(chunkParams);
      if (!chunks || chunks.length === 0) {
        console.warn(`No chunks generated for file ${file.id} using strategy ${chunkParams.strategy}`);
        return;
      }

      // 5. Generate embeddings using embedMany from 'ai'
      const texts = chunks.map(chunk => chunk.text);
      const { embeddings } = await embedMany({
        model: embeddingModel,
        values: texts
      });

      if (!embeddings || embeddings.length !== chunks.length) {
        throw new Error(`Mismatch between chunks (${chunks.length}) and embeddings (${embeddings?.length || 0}) count.`);
      }

      // Declare insertedChunkData outside the transaction scope
      let insertedChunkData: { vectorId: string; metadata: Record<string, any> }[] = [];

      // Begin transaction for database operations
      await this.db.transaction(async (trx) => {
        // Create a query runner scoped to this transaction
        const txRunner = createEmbeddingQueryRunner(trx);

        // Insert embeddings using the transaction runner
        insertedChunkData = await txRunner.insertTextEmbeddings(file, chunks, embeddings);

      }); // End Knex transaction

      // --- ArangoDB Graph Update (Post-Transaction) ---
      // Delegate graph update logic to ArangoDbService
      try {
        await arangoDbService.upsertGraphDataForFile(file, insertedChunkData);
        // Removed debug call to findNodeByGeneratedKey_DEBUG
        // TODO: Implement asynchronous background job for automated relationship extraction (consider moving trigger logic here or keeping in ArangoDbService)
      } catch (arangoError) {
        // Error is already logged within the service method.
        // Re-throw the error to ensure the overall processFile operation fails if the graph update fails.
        console.error(`Error during ArangoDB graph update triggered by processFile for file ${file.id}. Re-throwing error.`);
        throw arangoError; // Re-throw the original error
      }
      // --- End ArangoDB Graph Update ---

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error processing file ${file.id}: ${errorMessage}`);
      throw new Error(`Failed to process file ${file.id}: ${errorMessage}`);
    }
  }

  async deleteFileEmbeddings(fileId: string): Promise<void> {
    try {
      await this.db.transaction(async (trx) => {
        const txRunner = createEmbeddingQueryRunner(trx);
        await txRunner.deleteTextEmbeddingsByFileId(fileId);
      }); // End Knex transaction

      // --- ArangoDB Graph Update (Post-Transaction) ---
      // Delegate graph deletion logic to ArangoDbService
      try {
        await arangoDbService.deleteGraphDataForFile(fileId);
        // TODO: Implement robust asynchronous data synchronization for deletions (consider moving trigger logic here or keeping in ArangoDbService)
      } catch (arangoError) {
        // Error is already logged within the service method
        console.error(`Error during ArangoDB graph deletion triggered by deleteFileEmbeddings for file ${fileId}`);
        // Decide if this error should halt the entire process or just be logged
      }
      // --- End ArangoDB Graph Update ---

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error deleting embeddings for file ${fileId}: ${errorMessage}`);
      throw new Error(`Failed to delete embeddings for file ${fileId}: ${errorMessage}`);
    }
  }

  async queryEmbeddings({
    userId,
    queryText,
    limit,
    collectionId,
    includeMetadataFilters,
    excludeMetadataFilters,
    maxDistance,
    searchMode = 'vector',
    enableGraphSearch = false,
    graphDepth = 1,
    graphTopN = 3,
    graphRelationshipTypes,
    graphTraversalDirection = 'any', // Default to 'any'
  }: {
    userId: string;
    queryText: string;
    limit: number;
    collectionId?: string;
    searchMode?: 'vector' | 'keyword' | 'hybrid';
    includeMetadataFilters?: MetadataFilter[];
    excludeMetadataFilters?: MetadataFilter[];
    maxDistance?: number;
    enableGraphSearch?: boolean;
    graphDepth?: number;
    graphTopN?: number;
    graphRelationshipTypes?: string[];
    graphTraversalDirection?: 'any' | 'inbound' | 'outbound'; // Add to type definition
  }): Promise<Array<{
    vector_id: string;
    file_id: string;
    metadata: Record<string, any>;
    distance?: number;
    rank?: number;
    score?: number;
    // Add synthesized answer field to the class method return type
    synthesized_answer?: string;
  }>> {
    try {
      const kRRF = 60; // Constant for RRF calculation
      let synthesizedAnswer: string | undefined = undefined; // Variable to hold the synthesized answer

      let initialResults: Array<{
        vector_id: string;
        file_id: string;
        metadata: Record<string, any>;
        distance?: number;
        rank?: number;
        score?: number;
      }> = [];

      // --- Execute Searches based on Mode ---
      if (searchMode === 'vector') {
        initialResults = await performVectorSearch(
          this.db, userId, queryText, limit, collectionId,
          includeMetadataFilters, excludeMetadataFilters, maxDistance
        );
      } else if (searchMode === 'keyword') {
        initialResults = await performKeywordSearch(
          this.db, userId, queryText, limit, collectionId
        );
      } else if (searchMode === 'hybrid') {
        const [vectorResults, keywordResults] = await Promise.all([
          performVectorSearch(
            this.db, userId, queryText, limit, collectionId,
            includeMetadataFilters, excludeMetadataFilters, maxDistance
          ),
          performKeywordSearch(
            this.db, userId, queryText, limit, collectionId
          )
        ]);
        initialResults = applyRRF(vectorResults, keywordResults, limit, kRRF);
      } else {
        throw new Error(`Invalid search mode: ${searchMode}`);
      }

      // --- Reranking Step (using extracted function) ---
      // TODO: Reranking is currently disabled as it was causing issues and is not a priority.
      //       Re-enable by uncommenting the line below and ensuring the performReranking function
      //       in embedding.query.strategies.ts is also uncommented and functional.
      // const rerankedResults = await performReranking(initialResults, queryText, cogito, limit);
      // Use 'let' as finalResults might be reassigned by graph enhancement
      let finalResults = initialResults; // Use initial results directly when reranking is disabled

      // --- ArangoDB Graph Enhancement ---
      if (enableGraphSearch && finalResults.length > 0) {
        try {
          const nodeVectraIds = finalResults.map(r => r.vector_id);
          console.log(`DEBUG: Vector IDs passed to performGraphTraversal: ${JSON.stringify(nodeVectraIds)}`); // Log IDs being used for graph lookup
          if (nodeVectraIds.length > 0) {
            // Delegate graph traversal to ArangoDbService
            const graphTraversalResults = await arangoDbService.performGraphTraversal({
              startNodeVectraIds: nodeVectraIds,
              graphDepth: graphDepth,
              graphRelationshipTypes: graphRelationshipTypes,
              graphTraversalDirection: graphTraversalDirection, // Pass direction
            });

            // Create a map for easy lookup
            const graphDataMap = new Map<string, { start_node_data: any; neighbors: any[] }>();
            graphTraversalResults.forEach(item => {
              graphDataMap.set(item.start_node_vectra_id, {
                start_node_data: item.start_node_data,
                neighbors: item.neighbors
              });
            });

            // Define a boost factor (adjust as needed)
            const graphBoostFactor = 1.1; // Example: 10% boost

            // Enrich finalResults with graph data AND apply boost
            finalResults = finalResults.map(result => {
              const graphData = graphDataMap.get(result.vector_id);
              let boostedScore = result.score; // Start with original score

              if (graphData && graphData.neighbors && graphData.neighbors.length > 0) {
                // Apply boost if neighbors exist
                boostedScore = (result.score ?? 0) * graphBoostFactor; // Multiply score (handle potential undefined score)

                return {
                  ...result,
                  score: boostedScore, // Update the score
                  metadata: {
                    ...result.metadata,
                    arangodb_node: graphData.start_node_data, // Keep original node data
                    arangodb_neighbors: graphData.neighbors, // Add neighbors array
                  },
                };
              }
              // Return unchanged if no graph data or no neighbors found
              return result;
            });
            console.log(`ArangoDB: Attempted graph traversal for ${finalResults.length} results. Found graph data for ${graphTraversalResults.length}. Applied score boost where applicable.`); // Updated log
          }
        } catch (arangoError: any) {
          // Error is already logged within the service method
          console.error(`Error during ArangoDB graph enhancement triggered by queryEmbeddings`);
          // Decide if we should return partial results or throw? For now, just log error.
        }
      }
      // --- End ArangoDB Graph Enhancement ---

      // Ensure results are sorted by the potentially boosted score
      finalResults.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)); // Sort descending by score

      // --- LLM Synthesis Step (Step 4.2) ---
      if (finalResults.length > 0) {
        // Gather context from top results (e.g., top 3-5)
        console.log(`DEBUG: Final results before LLM synthesis: ${JSON.stringify(finalResults.length)}`); // Log final results before synthesis
        const contextLimit = finalResults.length; // How many top results to use for context
        let contextText = "";
        for (let i = 0; i < Math.min(finalResults.length, contextLimit); i++) {
          const result = finalResults[i];
          contextText += `Chunk ID: ${result.vector_id}\n`;
          contextText += `Source File: ${result.metadata?.filename || 'Unknown'}\n`;
          // Include chunk text (assuming it's in metadata)
          contextText += `Content: ${result.metadata?.chunk_text || result.metadata?.text_snippet || 'N/A'}\n`;
          // Include neighbor context if available
          if (result.metadata?.arangodb_neighbors && result.metadata.arangodb_neighbors.length > 0) {
             contextText += `Related Neighbors:\n`;
             result.metadata.arangodb_neighbors.forEach((neighbor: any) => {
                 contextText += `  - Neighbor ID: ${neighbor._key}, Type: ${neighbor.node_type}, Relationship: ${neighbor.relationship_type}\n`;
                 contextText += `    Content Snippet: ${neighbor.metadata?.text_snippet || 'N/A'}\n`;
             });
          }
          contextText += "---\n";
        }

        // Prepare synthesis prompt
        const synthesisPrompt = `Based *only* on the following context, provide a comprehensive answer to the query: "${queryText}"\n\nContext:\n${contextText}\n\nSynthesized Answer:`;

        try {
          console.log(`Calling LLM for synthesis based on ${Math.min(finalResults.length, contextLimit)} results...`);
          const synthesisResponse = await languageModel.doGenerate({
            inputFormat: 'messages',
            mode: { type: 'regular' },
            prompt: [{ role: 'user', content: [{ type: 'text', text: synthesisPrompt }] }]
          });
          synthesizedAnswer = synthesisResponse.text; // Store the synthesized answer
          console.log("LLM synthesis successful.");
        } catch (llmError) {
          console.error("Error during LLM synthesis:", llmError);
          // Proceed without synthesized answer if LLM fails
        }
      }
      // --- End LLM Synthesis Step ---


      // Map results, adding the synthesized answer to the first result if available
      return finalResults.map((result, index) => ({
        vector_id: result.vector_id,
        file_id: result.file_id,
        metadata: result.metadata, // Contains original chunk metadata + potentially arango node/neighbors
        distance: result.distance,
        rank: result.rank,
        score: result.score,
        // Add synthesized answer ONLY to the first result object
        synthesized_answer: index === 0 ? synthesizedAnswer : undefined,
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error querying embeddings for user ${userId}: ${errorMessage}`);
      throw new Error(`Failed to query embeddings: ${errorMessage}`);
    }
  }
}
