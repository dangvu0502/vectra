import { MDocument } from '@mastra/rag';
import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { Knex } from 'knex';
import type { File as DbFileType } from './file.model';

// Default chunking options
const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_OVERLAP_SIZE = 200;
const TEXT_EMBEDDINGS_TABLE = 'text_embeddings';
const KNOWLEDGE_METADATA_INDEX_TABLE = 'knowledge_metadata_index';

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
    console.log(`Processing file for embedding: ${file.id} (${file.filename})`);
    try {
      // Create document and chunk it using MDocument from @mastra/rag
      const doc = MDocument.fromText(file.content, {
        user_id: file.user_id,
        file_id: file.id,
        collection_id: file.collection_id,
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
      console.log(`Generated ${chunks.length} chunks for file ${file.id}`);

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
        // Insert embeddings into text_embeddings table
        const textEmbeddingInserts = chunks.map((chunk, i) => {
          const vectorId = `${file.id}_chunk_${i}`;
          const additionalMetadata = {
            chunk_index: i,
            chunk_text: chunk.text,
            ...(chunk.metadata || {})
          };

          return trx.raw(`
            INSERT INTO ${TEXT_EMBEDDINGS_TABLE} 
            (vector_id, user_id, file_id, collection_id, embedding, metadata, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?::vector, ?, NOW(), NOW())
          `, [
            vectorId,
            file.user_id,
            file.id,
            file.collection_id,
            JSON.stringify(embeddings[i]),
            JSON.stringify(additionalMetadata)
          ]);
        });

        await Promise.all(textEmbeddingInserts);
        console.log(`Inserted ${chunks.length} embeddings into ${TEXT_EMBEDDINGS_TABLE} for file ${file.id}`);

      // Always update the knowledge_metadata_index for the file itself
      try {
        // Create embedding for file metadata
        const fileText = `File: ${file.filename}. Content about: ${file.content.substring(0, 200)}...`;
        const { embeddings: fileEmbeddings } = await embedMany({
          model: openai.embedding('text-embedding-3-small'),
          values: [fileText]
        });
        const fileEmbedding = fileEmbeddings[0];

        // Log before knowledge_metadata_index operation
        console.log(`Starting knowledge metadata index update for file ${file.id}`);
        
        // Upsert into knowledge_metadata_index for the file
        const fileResult = await trx.raw(`
          INSERT INTO ${KNOWLEDGE_METADATA_INDEX_TABLE}
          (user_id, text_content, embedding, entity_type, entity_id, created_at, updated_at)
          VALUES (?, ?, ?::vector, ?, ?, NOW(), NOW())
          ON CONFLICT (entity_type, entity_id) 
          DO UPDATE SET 
            text_content = EXCLUDED.text_content,
            embedding = EXCLUDED.embedding,
            updated_at = NOW()
          RETURNING id
        `, [
          file.user_id,
          fileText,
          JSON.stringify(fileEmbedding),
          'file',
          file.id
        ]);

        console.log(`Successfully updated knowledge metadata index for file ${file.id}`);
        console.log(`Operation result:`, fileResult.rows[0]);
      } catch (error) {
        console.error(`Error updating knowledge metadata index for file ${file.id}:`, error);
        // Don't throw here, continue with collection update if applicable
      }

      // If this is a collection file, also update the knowledge_metadata_index for the collection
      if (file.collection_id) {
        // Get collection details
        const collection = await trx('collections')
          .where('id', file.collection_id)
          .first();

        if (collection) {
          // Create embedding for collection metadata
          const collectionText = `Collection: ${collection.name}. ${collection.description || ''}`;
          const { embeddings: collectionEmbeddings } = await embedMany({
            model: openai.embedding('text-embedding-3-small'),
            values: [collectionText]
          });
          const collectionEmbedding = collectionEmbeddings[0];

          // Log before knowledge_metadata_index operation
          console.log(`Starting knowledge metadata index update for collection ${collection.id}`);
          console.log(`Table exists check: ${KNOWLEDGE_METADATA_INDEX_TABLE}`);
          
          try {
            // Upsert into knowledge_metadata_index
            const result = await trx.raw(`
              INSERT INTO ${KNOWLEDGE_METADATA_INDEX_TABLE}
              (user_id, text_content, embedding, entity_type, entity_id, created_at, updated_at)
              VALUES (?, ?, ?::vector, ?, ?, NOW(), NOW())
              ON CONFLICT (entity_type, entity_id) 
              DO UPDATE SET 
                text_content = EXCLUDED.text_content,
                embedding = EXCLUDED.embedding,
                updated_at = NOW()
              RETURNING id
            `, [
              file.user_id,
              collectionText,
              JSON.stringify(collectionEmbedding),
              'collection',
              collection.id
            ]);

            console.log(`Successfully updated knowledge metadata index for collection ${collection.id}`);
            console.log(`Operation result:`, result.rows[0]);
          } catch (error) {
            console.error(`Error updating knowledge metadata index for collection ${collection.id}:`, error);
            throw error;
          }
        }
      }
      });

      console.log(`Successfully processed and embedded file ${file.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error processing file ${file.id}: ${errorMessage}`);
      throw new Error(`Failed to process file ${file.id}: ${errorMessage}`);
    }
  }

  async deleteFileEmbeddings(fileId: string): Promise<void> {
    try {
      console.log(`Deleting embeddings for file ${fileId}`);
      
      await this.db.transaction(async (trx) => {
        // Delete from text_embeddings
        const deleteResult = await trx(TEXT_EMBEDDINGS_TABLE)
          .where('file_id', fileId)
          .delete();
        
        console.log(`Deleted ${deleteResult} embeddings for file ${fileId}`);
        
        // Delete file entry from knowledge_metadata_index
        const deleteMetadataResult = await trx(KNOWLEDGE_METADATA_INDEX_TABLE)
          .where({
            entity_type: 'file',
            entity_id: fileId
          })
          .delete();
        
        console.log(`Deleted ${deleteMetadataResult} entries from knowledge metadata index for file ${fileId}`);
        
        // Check if we need to update knowledge_metadata_index
        const file = await trx('files').where('id', fileId).first();
        if (file && file.collection_id) {
          // Check if this was the last file in the collection
          const remainingFiles = await trx('files')
            .where('collection_id', file.collection_id)
            .whereNot('id', fileId)
            .count('id as count')
            .first();
          
          // If no files left in collection, remove from knowledge_metadata_index
          if (remainingFiles && Number(remainingFiles.count) === 0) {
            await trx(KNOWLEDGE_METADATA_INDEX_TABLE)
              .where({
                entity_type: 'collection',
                entity_id: file.collection_id
              })
              .delete();
            
            console.log(`Removed collection ${file.collection_id} from knowledge metadata index`);
          }
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error deleting embeddings for file ${fileId}: ${errorMessage}`);
      throw new Error(`Failed to delete embeddings for file ${fileId}: ${errorMessage}`);
    }
  }
}
