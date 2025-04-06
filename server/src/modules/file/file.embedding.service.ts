import { MDocument } from '@mastra/rag';
import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
// Removed duplicate imports
import type { Knex } from 'knex';
import type { File as DbFileType } from './file.schema';
// Import the query runner factory
import { createEmbeddingQueryRunner } from './file.embedding.queries';

// Default chunking options
const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_OVERLAP_SIZE = 200;

// Interface defining the service's responsibilities
export interface IEmbeddingService {
  processFile(file: DbFileType): Promise<void>;
  deleteFileEmbeddings(fileId: string): Promise<void>;
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
    // console.log(`Processing file for embedding: ${file.id} (${file.filename})`);
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

      const chunks = await doc.chunk();
      if (!chunks || chunks.length === 0) {
        console.warn(`No chunks generated for file ${file.id}`);
        return;
      }
      // console.log(`Generated ${chunks.length} chunks for file ${file.id}`);

      // Generate embeddings using embedMany from 'ai'
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
        // console.log(`Inserted ${chunks.length} embeddings into ${TEXT_EMBEDDINGS_TABLE} for file ${file.id}`);

      // Removed the try...catch block for upserting file knowledge index as the function is removed
      // try {
      //   // Create text for file metadata embedding using filename and first chunk
      //   const firstChunkText = chunks[0]?.text || ''; // Get text of the first chunk, handle if no chunks
      //   const fileText = `Filename: ${file.filename}\n\n${firstChunkText}`; // Use filename + first chunk
      //   // console.log(`[EmbeddingService] Generating metadata embedding for file ${file.id} using text (first 100 chars): "${fileText.substring(0, 100)}..."`);
      //
      //   const { embeddings: fileEmbeddings } = await embedMany({
      //     model: openai.embedding('text-embedding-3-small'),
      //     values: [fileText]
      //   });
      //   const fileEmbedding = fileEmbeddings[0];
      //
      //   // Upsert file knowledge index using the transaction runner
      //   await txRunner.upsertFileKnowledgeIndex(file.user_id, file.id, fileText, fileEmbedding); // This line is removed
      //   // console.log(`[EmbeddingService] Successfully updated knowledge metadata index for file ${file.id}`);
      // } catch (error) {
      //   console.error(`[EmbeddingService] Error updating knowledge metadata index for file ${file.id}:`, error);
      // }

      // Removed logic to update collection knowledge index here.
      // This should be handled separately, perhaps when collections are explicitly updated or queried.

      });

      // console.log(`Successfully processed and embedded file ${file.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error processing file ${file.id}: ${errorMessage}`);
      throw new Error(`Failed to process file ${file.id}: ${errorMessage}`);
    }
  }

  async deleteFileEmbeddings(fileId: string): Promise<void> {
    try {
      // console.log(`Deleting embeddings for file ${fileId}`);
      
      await this.db.transaction(async (trx) => {
        // Create a query runner scoped to this transaction
        const txRunner = createEmbeddingQueryRunner(trx);

        // Delete text embeddings using the transaction runner
        await txRunner.deleteTextEmbeddingsByFileId(fileId);

        // Removed call to deleteFileKnowledgeIndex as the function is removed
        // await txRunner.deleteFileKnowledgeIndex(fileId);

        // Removed logic that checked for collection_id and potentially deleted collection knowledge index.
        // This logic needs to be handled elsewhere due to the many-to-many relationship.

      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error deleting embeddings for file ${fileId}: ${errorMessage}`);
      throw new Error(`Failed to delete embeddings for file ${fileId}: ${errorMessage}`);
    }
  }
}
