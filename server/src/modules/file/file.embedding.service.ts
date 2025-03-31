import { MDocument } from '@mastra/rag';
import { embedMany } from 'ai';
// Use typeof to get the specific type of the imported embeddingModel instance
import { embeddingModel, mastra } from '@/modules/mastra'; // Using path alias again & Import centralized instances
// Remove import from ./types
import type { File as DbFileType } from './file.model'; // Import the Zod-derived type
import type { PgVector } from '@mastra/pg';

// Default chunking options (can be overridden if needed)
const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_OVERLAP_SIZE = 200;
const VECTOR_INDEX_NAME = 'text_embeddings'; // Updated table name

// Interface defining the service's responsibilities
export interface IEmbeddingService {
  processFile(file: DbFileType): Promise<void>; // Use DbFileType from model
  deleteFileEmbeddings(fileId: string): Promise<void>;
} // Corrected closing brace if it was missing

// Implementation using centralized Mastra components
export class EmbeddingService implements IEmbeddingService {
  private static instance: EmbeddingService | null = null; // Keep static instance

  // Use injected/imported centralized instances
  private readonly _embeddingModel: typeof embeddingModel; // Use specific type
  private readonly vectorStore: PgVector; // Use specific type
  private readonly options: { chunkSize: number; overlapSize: number };

  // Constructor now takes centralized instances with specific types
  private constructor( // Keep constructor private
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

  // Keep static getInstance method
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

  // Keep static resetInstance method (optional but common with singletons)
  static resetInstance(): void {
    EmbeddingService.instance = null;
  }


  async processFile(file: DbFileType): Promise<void> { // Use DbFileType
    console.log(`Processing file for embedding: ${file.id} (${file.filename})`);
    try {
      const metadata = {
        user_id: file.user_id,
        collection_id: file.collection_id,
        file_id: file.id, // Crucial for filtering
        filename: file.filename,
        created_at: file.created_at.toISOString(), // Use created_at from DbFileType
        ...(file.metadata || {}), // Spread existing metadata if it exists
      };

      const doc = MDocument.fromText(file.content, {
        ...metadata, 
        chunkSize: this.options.chunkSize,
        overlapSize: this.options.overlapSize,
      });

      const chunks = await doc.chunk();
      if (!chunks || chunks.length === 0) {
        console.warn(`No chunks generated for file ${file.id}`);
        return;
      }
      console.log(`Generated ${chunks.length} chunks for file ${file.id}`);

      const { embeddings } = await embedMany({
        values: chunks.map(chunk => chunk.text),
        model: this._embeddingModel,
      });

      if (!embeddings || embeddings.length !== chunks.length) {
        throw new Error(`Mismatch between chunks (${chunks.length}) and embeddings (${embeddings?.length || 0}) count.`);
      }

      // Prepare data for PgVector upsert
      const vectorIds = chunks.map((_, i) => `${file.id}_chunk_${i}`); // Generate IDs matching 'vector_id' column
      const vectorEmbeddings = embeddings; // Raw number[][]
      const vectorMetadata = chunks.map((chunk, i) => ({
          ...(chunk.metadata || {}),
          chunk_index: i,
          chunk_text: chunk.text, // Store chunk text in metadata for retrieval
      }));

      const upsertPayload = {
        indexName: VECTOR_INDEX_NAME,
        vectors: vectorEmbeddings,
        ids: vectorIds,
        metadata: vectorMetadata,
      };

      console.log(`Upserting ${vectorEmbeddings.length} vectors into index '${VECTOR_INDEX_NAME}' for file ${file.id}`);
      // Log the payload structure (omitting potentially large vectors for brevity)
      console.log(`Upsert Payload (excluding vectors):`, JSON.stringify({ ...upsertPayload, vectors: `[${vectorEmbeddings.length} vectors]` }, null, 2));

      try {
        // Upsert into PgVector - Pass vectors, ids, and metadata arrays. Specify the correct index name.
        const upsertResult = await this.vectorStore.upsert(upsertPayload);

        // Log the result from the upsert operation, if any
        console.log(`Upsert operation result for file ${file.id}:`, upsertResult);

        // Only log success if no error was thrown and potentially if result indicates success
        console.log(`Successfully processed and embedded file ${file.id}`);
      } catch (upsertError) {
        // Catch specific errors from the upsert call
        console.error(`Error during vectorStore.upsert for file ${file.id}:`, upsertError);
        // Re-throw to ensure the overall process fails
        throw upsertError;
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error processing file ${file.id}: ${errorMessage}`);
      // Re-throw the error or handle it (e.g., update document metadata with error state)
      throw new Error(`Failed to process file ${file.id}: ${errorMessage}`);
    }
  }

  // Removed search methods - handled by Mastra RAG tools

  async deleteFileEmbeddings(fileId: string): Promise<void> {
    try {
      // Use the correct index name here as well
      console.log(`Attempting to delete embeddings for file ${fileId} from index '${VECTOR_INDEX_NAME}'`);

      // Confirmed limitation: @mastra/pg PgVector might not support deletion by metadata filter directly.
      // Deletion might require fetching vector IDs first based on the filter, then deleting by ID.
      // This functionality is currently skipped pending clarification or updates in the library.
      /*
      const deleteResult = await this.vectorStore.delete({ // Method and filter syntax need verification
          indexName: VECTOR_INDEX_NAME,
          filter: { 'file_id': fileId } // Example filter, needs verification
      });
      console.log(`Deletion result for file ${fileId}:`, deleteResult);
      */
      console.warn(`Vector deletion by metadata filter for file ${fileId} is currently skipped due to library limitations.`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error deleting embeddings for file ${fileId}: ${errorMessage}`);
      throw new Error(`Failed to delete embeddings for file ${fileId}: ${errorMessage}`);
    }
  }
}

// Keep instance export
export const embeddingService = EmbeddingService.getInstance(embeddingModel, mastra.getVector("pgvector"));
