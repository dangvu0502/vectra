import type { Knex } from 'knex';

const TABLE_NAME = 'text_embeddings';
const VECTOR_DIMENSION = 1536;

export const text_embeddings_schema = {
  up: async function up(knex: Knex): Promise<void> {
    return knex.transaction(async (trx) => {
      // Verify dependent tables exist
      const hasUsers = await trx.schema.hasTable('users');
      const hasFiles = await trx.schema.hasTable('files');
      if (!hasUsers) throw new Error('users table must exist first');
      if (!hasFiles) throw new Error('files table must exist first');

      await knex.schema.createTable(TABLE_NAME, (table) => {
        table.text('vector_id').primary(); // Primary key for chunk ID
        table.specificType('embedding', `vector(${VECTOR_DIMENSION})`).notNullable(); // Renamed vector column to embedding
        table.jsonb('metadata').notNullable(); // Metadata for the chunk
        table.timestamps(true, true); // Adds created_at and updated_at
      });

      // Add GIN index for metadata querying if you plan to filter by metadata often
      await knex.schema.alterTable(TABLE_NAME, (table) => {
        table.index('metadata', `${TABLE_NAME}_metadata_gin_idx`, 'GIN');
      });

      console.log(`Created table ${TABLE_NAME} with vector dimension ${VECTOR_DIMENSION}`);
    });
  },

  down: async function down(knex: Knex): Promise<void> {
    return knex.transaction(async (trx) => {
      await trx.schema.dropTableIfExists(TABLE_NAME);
    });
  }
};