import type { Knex } from 'knex';
import { PG_TABLE_NAMES } from '../../constants';
import { VECTOR_DIMENSION } from '@/config/constants';

export const text_embeddings_schema = {
  up: async function up(knex: Knex): Promise<void> {
    return knex.transaction(async (trx) => {
      await knex.raw(`CREATE EXTENSION IF NOT EXISTS vector;`);

      const hasUsers = await trx.schema.hasTable(PG_TABLE_NAMES.USERS);
      const hasFiles = await trx.schema.hasTable(PG_TABLE_NAMES.FILES);
      if (!hasUsers) throw new Error(`Table "${PG_TABLE_NAMES.USERS}" must exist first`);
      if (!hasFiles) throw new Error(`Table "${PG_TABLE_NAMES.FILES}" must exist first`);

      // In PostgreSQL, partitioning must be defined at table creation time, hence using raw SQL.
      await knex.raw(`
        CREATE TABLE ${PG_TABLE_NAMES.TEXT_EMBEDDINGS} (
          vector_id TEXT NOT NULL,
          user_id UUID NOT NULL REFERENCES ${PG_TABLE_NAMES.USERS}(id) ON DELETE CASCADE,
          file_id UUID NOT NULL REFERENCES ${PG_TABLE_NAMES.FILES}(id) ON DELETE CASCADE,
          embedding VECTOR(${VECTOR_DIMENSION}) NOT NULL,
          metadata JSONB NOT NULL,
          chunk_text TEXT NOT NULL, -- Store original chunk text for FTS processing
          fts_vector TSVECTOR, -- Column for FTS index
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (vector_id, user_id)
        ) PARTITION BY HASH (user_id);
      `);
      
      for (let i = 0; i < 4; i++) {
        await knex.raw(`
          CREATE TABLE ${PG_TABLE_NAMES.TEXT_EMBEDDINGS}_part_${i} PARTITION OF ${PG_TABLE_NAMES.TEXT_EMBEDDINGS}
          FOR VALUES WITH (modulus 4, remainder ${i});
        `);
      }

      await knex.raw(`CREATE INDEX ${PG_TABLE_NAMES.TEXT_EMBEDDINGS}_user_id_idx ON ${PG_TABLE_NAMES.TEXT_EMBEDDINGS} (user_id);`);
      await knex.raw(`CREATE INDEX ${PG_TABLE_NAMES.TEXT_EMBEDDINGS}_file_id_idx ON ${PG_TABLE_NAMES.TEXT_EMBEDDINGS} (file_id);`);
      await knex.raw(`CREATE INDEX ${PG_TABLE_NAMES.TEXT_EMBEDDINGS}_metadata_gin_idx ON ${PG_TABLE_NAMES.TEXT_EMBEDDINGS} USING GIN (metadata);`);
      await knex.raw(`CREATE INDEX ${PG_TABLE_NAMES.TEXT_EMBEDDINGS}_fts_vector_gin_idx ON ${PG_TABLE_NAMES.TEXT_EMBEDDINGS} USING GIN (fts_vector);`);
      await knex.raw(`
        CREATE INDEX ${PG_TABLE_NAMES.TEXT_EMBEDDINGS}_embedding_hnsw_idx
        ON ${PG_TABLE_NAMES.TEXT_EMBEDDINGS} USING hnsw (embedding vector_cosine_ops);
      `);

      console.log(`Created table ${PG_TABLE_NAMES.TEXT_EMBEDDINGS} with vector dimension ${VECTOR_DIMENSION}, partitioning, and FTS support`);
    });

    // Using 'english' configuration for FTS trigger, adjust if multi-language support is needed.
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
      BEFORE INSERT OR UPDATE ON ${PG_TABLE_NAMES.TEXT_EMBEDDINGS}
      FOR EACH ROW EXECUTE FUNCTION update_fts_vector();
    `);

  },

  down: async function down(knex: Knex): Promise<void> {
    return knex.transaction(async (trx) => {
      await trx.raw(`DROP TRIGGER IF EXISTS update_fts_trigger ON ${PG_TABLE_NAMES.TEXT_EMBEDDINGS};`);
      await trx.raw(`DROP FUNCTION IF EXISTS update_fts_vector();`);

      for (let i = 0; i < 4; i++) {
        await trx.raw(`DROP TABLE IF EXISTS ${PG_TABLE_NAMES.TEXT_EMBEDDINGS}_part_${i}`);
      }
      await trx.schema.dropTableIfExists(PG_TABLE_NAMES.TEXT_EMBEDDINGS);
    });
  }
};
