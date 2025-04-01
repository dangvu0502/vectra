import type { Knex } from 'knex';

const TABLE_NAME = 'text_embeddings';
const VECTOR_DIMENSION = 1536;

export const text_embeddings_schema = {
  up: async function up(knex: Knex): Promise<void> {
    return knex.transaction(async (trx) => {
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
          collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
          embedding VECTOR(${VECTOR_DIMENSION}) NOT NULL,
          metadata JSONB NOT NULL,
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
      await knex.raw(`CREATE INDEX ${TABLE_NAME}_collection_id_idx ON ${TABLE_NAME} (collection_id);`);
      
      // Add GIN index for metadata querying
      await knex.raw(`CREATE INDEX ${TABLE_NAME}_metadata_gin_idx ON ${TABLE_NAME} USING GIN (metadata);`);

      // Create HNSW index for vector similarity search
      await knex.raw(`
        CREATE INDEX ${TABLE_NAME}_embedding_hnsw_idx 
        ON ${TABLE_NAME} USING hnsw (embedding vector_cosine_ops);
      `);

      console.log(`Created table ${TABLE_NAME} with vector dimension ${VECTOR_DIMENSION} and partitioning`);
    });
  },

  down: async function down(knex: Knex): Promise<void> {
    return knex.transaction(async (trx) => {
      // Drop partitions first
      for (let i = 0; i < 4; i++) {
        await trx.raw(`DROP TABLE IF EXISTS ${TABLE_NAME}_part_${i}`);
      }
      await trx.schema.dropTableIfExists(TABLE_NAME);
    });
  }
};
