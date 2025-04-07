import type { Knex } from 'knex';

const TABLE_NAME = 'text_embeddings';
const VECTOR_DIMENSION = 1536;

export const text_embeddings_schema = {
  up: async function up(knex: Knex): Promise<void> {
    return knex.transaction(async (trx) => {
      // Ensure pgvector extension is installed
      await knex.raw(`CREATE EXTENSION IF NOT EXISTS vector;`);
      
      // Verify dependent tables exist
      const hasUsers = await trx.schema.hasTable('users');
      const hasFiles = await trx.schema.hasTable('files');
      const hasCollections = await trx.schema.hasTable('collections');
      if (!hasUsers) throw new Error('users table must exist first');
      if (!hasFiles) throw new Error('files table must exist first');
      if (!hasCollections) throw new Error('collections table must exist first');

      // Create the partitioned table using raw SQL
      // In PostgreSQL, partitioning must be defined at table creation time
      await knex.raw(`
        CREATE TABLE ${TABLE_NAME} (
          vector_id TEXT NOT NULL,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
          embedding VECTOR(${VECTOR_DIMENSION}) NOT NULL,
          metadata JSONB NOT NULL,
          chunk_text TEXT NOT NULL, -- Store original chunk text for FTS processing
          fts_vector TSVECTOR, -- Column for FTS index
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (vector_id, user_id)
        ) PARTITION BY HASH (user_id);
      `);
      
      // Create 4 hash partitions
      for (let i = 0; i < 4; i++) {
        await knex.raw(`
          CREATE TABLE ${TABLE_NAME}_part_${i} PARTITION OF ${TABLE_NAME}
          FOR VALUES WITH (modulus 4, remainder ${i});
        `);
      }

      // Add indexes for efficient filtering
      await knex.raw(`CREATE INDEX ${TABLE_NAME}_user_id_idx ON ${TABLE_NAME} (user_id);`);
      await knex.raw(`CREATE INDEX ${TABLE_NAME}_file_id_idx ON ${TABLE_NAME} (file_id);`);
      
      // Add GIN index for metadata querying
      await knex.raw(`CREATE INDEX ${TABLE_NAME}_metadata_gin_idx ON ${TABLE_NAME} USING GIN (metadata);`);

      // Add GIN index for Full-Text Search on the new tsvector column
      await knex.raw(`CREATE INDEX ${TABLE_NAME}_fts_vector_gin_idx ON ${TABLE_NAME} USING GIN (fts_vector);`);

      // Create HNSW index for vector similarity search
      await knex.raw(`
        CREATE INDEX ${TABLE_NAME}_embedding_hnsw_idx 
        ON ${TABLE_NAME} USING hnsw (embedding vector_cosine_ops);
      `);

      console.log(`Created table ${TABLE_NAME} with vector dimension ${VECTOR_DIMENSION}, partitioning, and FTS support`);
    });

    // Add a trigger to automatically update the fts_vector column when chunk_text changes
    // Using 'english' configuration, adjust if multi-language support is needed
    await knex.raw(`
      CREATE OR REPLACE FUNCTION update_fts_vector() RETURNS TRIGGER AS $$
      BEGIN
        NEW.fts_vector := to_tsvector('english', NEW.chunk_text);
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await knex.raw(`
      CREATE TRIGGER update_fts_trigger
      BEFORE INSERT OR UPDATE ON ${TABLE_NAME}
      FOR EACH ROW EXECUTE FUNCTION update_fts_vector();
    `);

  },

  down: async function down(knex: Knex): Promise<void> {
    return knex.transaction(async (trx) => {
      // Drop the trigger and function first
      await trx.raw(`DROP TRIGGER IF EXISTS update_fts_trigger ON ${TABLE_NAME};`);
      await trx.raw(`DROP FUNCTION IF EXISTS update_fts_vector();`);

      // Drop partitions
      for (let i = 0; i < 4; i++) {
        await trx.raw(`DROP TABLE IF EXISTS ${TABLE_NAME}_part_${i}`);
      }
      await trx.schema.dropTableIfExists(TABLE_NAME);
    });
  }
};
