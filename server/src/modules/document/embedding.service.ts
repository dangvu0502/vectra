import { MDocument } from '@mastra/rag';
import { embedMany } from 'ai';
// Use typeof to get the specific type of the imported embeddingModel instance
import { embeddingModel, mastra } from '@/modules/mastra'; // Using path alias again & Import centralized instances
import type { Document } from './types';
import type { PgVector } from '@mastra/pg';

// Default chunking options (can be overridden if needed)
const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_OVERLAP_SIZE = 200;
const VECTOR_INDEX_NAME = 'mastra_vectors'; // Set to the newly created table name

// Interface defining the service's responsibilities
export interface IEmbeddingService {
  processDocument(document: Document): Promise<void>;
  deleteDocumentEmbeddings(docId: string): Promise<void>;
} // Added missing closing brace

// Implementation using centralized Mastra components
export class EmbeddingService implements IEmbeddingService {
  private static instance: EmbeddingService | null = null; // Added back static instance

  // Use injected/imported centralized instances
  private readonly _embeddingModel: typeof embeddingModel; // Use specific type
  private readonly vectorStore: PgVector; // Use specific type
  private readonly options: { chunkSize: number; overlapSize: number };

  // Constructor now takes centralized instances with specific types
  private constructor( // Made constructor private again
    embeddingModelInstance: typeof embeddingModel,
    vectorStoreInstance: PgVector,
    options: { chunkSize?: number; overlapSize?: number } = {}
  ) {
    this._embeddingModel = embeddingModelInstance;
    this.vectorStore = vectorStoreInstance;
    this.options = {
      chunkSize: options.chunkSize || DEFAULT_CHUNK_SIZE,
      overlapSize: options.overlapSize || DEFAULT_OVERLAP_SIZE,
    };
  }

  // Added back static getInstance method
  static getInstance(
    embeddingModelInstance: typeof embeddingModel,
    vectorStoreInstance: PgVector,
    options: { chunkSize?: number; overlapSize?: number } = {}
  ): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService(
        embeddingModelInstance,
        vectorStoreInstance,
        options
      );
    }
    return EmbeddingService.instance;
  }

  // Added back static resetInstance method (optional but common with singletons)
  static resetInstance(): void {
    EmbeddingService.instance = null;
  }


  async processDocument(document: Document): Promise<void> {
    console.log(`Processing document for embedding: ${document.id} (${document.filename})`);
    try {
      const doc = MDocument.fromText(document.content, {
        // Pass document metadata that might be useful for filtering later
        metadata: {
          doc_id: document.id, // Crucial for filtering
          filename: document.filename,
          created_at: document.createdAt.toISOString(),
          // Add any other relevant metadata from document.metadata if needed
          ...(document.metadata || {})
        },
        chunkSize: this.options.chunkSize,
        overlapSize: this.options.overlapSize,
      });

      const chunks = await doc.chunk();
      if (!chunks || chunks.length === 0) {
        console.warn(`No chunks generated for document ${document.id}`);
        return;
      }
      console.log(`Generated ${chunks.length} chunks for document ${document.id}`);

      const { embeddings } = await embedMany({
        values: chunks.map(chunk => chunk.text),
        model: this._embeddingModel,
      });

      if (!embeddings || embeddings.length !== chunks.length) {
        throw new Error(`Mismatch between chunks (${chunks.length}) and embeddings (${embeddings?.length || 0}) count.`);
      }

      // Prepare data for PgVector upsert
      const vectorIds = chunks.map((_, i) => `${document.id}_chunk_${i}`); // Generate IDs matching 'vector_id' column
      const vectorEmbeddings = embeddings; // Raw number[][]
      const vectorMetadata = chunks.map((chunk, i) => ({
        // id: chunkId, // Removed ID from metadata
        ...chunk.metadata, // Includes doc_id, filename etc. from MDocument creation
        chunk_index: i,
        chunk_text: chunk.text, // Store chunk text in metadata for retrieval
      }));


      const upsertPayload = {
        indexName: VECTOR_INDEX_NAME,
        vectors: vectorEmbeddings,
        ids: vectorIds,
        metadata: vectorMetadata
      };

      console.log(`Upserting ${vectorEmbeddings.length} vectors into index '${VECTOR_INDEX_NAME}' for document ${document.id}`);
      // Log the payload structure (omitting potentially large vectors for brevity)
      console.log(`Upsert Payload (excluding vectors):`, JSON.stringify({ ...upsertPayload, vectors: `[${vectorEmbeddings.length} vectors]` }, null, 2));

      try {
        // Upsert into PgVector - Pass vectors, ids, and metadata arrays. Specify the correct index name.
        const upsertResult = await this.vectorStore.upsert(upsertPayload);

        // Log the result from the upsert operation, if any
        console.log(`Upsert operation result for document ${document.id}:`, upsertResult);

        // Only log success if no error was thrown and potentially if result indicates success
        console.log(`Successfully processed and embedded document ${document.id}`);
      } catch (upsertError) {
        // Catch specific errors from the upsert call
        console.error(`Error during vectorStore.upsert for document ${document.id}:`, upsertError);
        // Re-throw to ensure the overall process fails
        throw upsertError;
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error processing document ${document.id}: ${errorMessage}`);
      // Re-throw the error or handle it (e.g., update document metadata with error state)
      throw new Error(`Failed to process document ${document.id}: ${errorMessage}`);
    }
  }

  // Removed search methods - handled by Mastra RAG tools

  async deleteDocumentEmbeddings(docId: string): Promise<void> {
    try {
      // Use the correct index name here as well
      console.log(`Attempting to delete embeddings for document ${docId} from index '${VECTOR_INDEX_NAME}'`);

      // TODO: Verify the correct method and signature for deleting vectors by metadata filter in @mastra/pg PgVector.
      // The following attempts ('delete', 'deleteVectors' with filter object) failed.
      // It might require querying for IDs first and deleting by ID, or a different filter syntax/method.
      // For now, vector deletion is commented out.
      /* 
      const deleteResult = await this.vectorStore.delete({ // Or deleteVectors, deleteByFilter?
          indexName: VECTOR_INDEX_NAME, 
          filter: { doc_id: docId } // Verify filter syntax if method exists
      });
      console.log(`Deletion result for document ${docId}:`, deleteResult); 
      */
      console.warn(`Vector deletion for document ${docId} is currently skipped. Verify @mastra/pg delete method.`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error deleting embeddings for document ${docId}: ${errorMessage}`);
      throw new Error(`Failed to delete embeddings for document ${docId}: ${errorMessage}`);
    }
  }
}

// Added back instance export, initialized using getInstance and imported dependencies
export const embeddingService = EmbeddingService.getInstance(embeddingModel, mastra.getVector("pgvector"));
