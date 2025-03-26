import { MDocument } from '@mastra/rag';
import { embedMany } from 'ai';
import type { PgVector } from '@mastra/pg'; // Import PgVector type
// Use typeof to get the specific type of the imported embeddingModel instance
import type { embeddingModel as EmbeddingModelType, pgVector as PgVectorType } from '../mastra/config'; 
import type { Document } from './types';
import { embeddingModel, pgVector } from '../mastra/config'; // Import centralized instances

// Default chunking options (can be overridden if needed)
const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_OVERLAP_SIZE = 200;
const VECTOR_INDEX_NAME = 'documents'; // Assumed index name used in Mastra config

// Interface defining the service's responsibilities
export interface EmbeddingService {
  processDocument(document: Document): Promise<void>;
  deleteDocumentEmbeddings(docId: string): Promise<void>;
}

// Implementation using centralized Mastra components
export class EmbeddingServiceImpl implements EmbeddingService {
  private static instance: EmbeddingServiceImpl | null = null;
  
  // Use injected/imported centralized instances
  private readonly embeddingModel: typeof EmbeddingModelType; // Use specific type
  private readonly vectorStore: typeof PgVectorType; // Use specific type
  private readonly options: { chunkSize: number; overlapSize: number };

  // Constructor now takes centralized instances with specific types
  private constructor(
    embeddingModelInstance: typeof EmbeddingModelType, 
    vectorStoreInstance: typeof PgVectorType,
    options: { chunkSize?: number; overlapSize?: number } = {}
  ) {
    this.embeddingModel = embeddingModelInstance;
    this.vectorStore = vectorStoreInstance;
    this.options = {
      chunkSize: options.chunkSize || DEFAULT_CHUNK_SIZE,
      overlapSize: options.overlapSize || DEFAULT_OVERLAP_SIZE,
    };
  }

  // Updated getInstance to accept centralized instances with specific types
  static getInstance(
    embeddingModelInstance: typeof EmbeddingModelType, 
    vectorStoreInstance: typeof PgVectorType,
    options: { chunkSize?: number; overlapSize?: number } = {}
  ): EmbeddingServiceImpl {
    if (!EmbeddingServiceImpl.instance) {
      EmbeddingServiceImpl.instance = new EmbeddingServiceImpl(
        embeddingModelInstance, 
        vectorStoreInstance, 
        options
      );
    }
    return EmbeddingServiceImpl.instance;
  }

  static resetInstance(): void {
      EmbeddingServiceImpl.instance = null;
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
        model: this.embeddingModel,
      });

      if (!embeddings || embeddings.length !== chunks.length) {
        throw new Error(`Mismatch between chunks (${chunks.length}) and embeddings (${embeddings?.length || 0}) count.`);
      }

      // Prepare data for PgVector upsert, separating vectors, ids, and metadata
      const vectorIds = chunks.map((_, i) => `${document.id}_chunk_${i}`);
      const vectorEmbeddings = embeddings; // Raw number[][]
      const vectorMetadata = chunks.map((chunk, i) => ({
          ...chunk.metadata, // Includes doc_id, filename etc. from MDocument creation
          chunk_index: i,
          chunk_text: chunk.text, // Store chunk text in metadata for retrieval
      }));


      console.log(`Upserting ${vectorEmbeddings.length} vectors into index '${VECTOR_INDEX_NAME}' for document ${document.id}`);
      // Upsert into PgVector - Pass vectors, ids, and metadata arrays if supported
      await this.vectorStore.upsert({ 
          indexName: VECTOR_INDEX_NAME, 
          vectors: vectorEmbeddings, 
          ids: vectorIds, // Pass IDs if supported
          metadata: vectorMetadata // Pass metadata if supported
      });
      console.log(`Successfully processed and embedded document ${document.id}`);

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
