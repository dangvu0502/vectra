import type { Knex } from 'knex';

const TABLE_NAME = 'knowledge_metadata_index';
const VECTOR_DIMENSION = 1536;

export const knowledge_metadata_index_schema = {
  up: async function up(knex: Knex): Promise<void> {
    return knex.transaction(async (trx) => {
      // Verify dependent tables exist
      const hasUsers = await trx.schema.hasTable('users');
      const hasCollections = await trx.schema.hasTable('collections');
      if (!hasUsers) throw new Error('users table must exist first');
      if (!hasCollections) throw new Error('collections table must exist first');

      await knex.schema.createTable(TABLE_NAME, (table) => {
        table.uuid('id').primary().defaultTo(knex.fn.uuid());
        table.uuid('user_id').notNullable().references('users.id').onDelete('CASCADE');
        table.text('text_content').notNullable();
        table.specificType('embedding', `vector(${VECTOR_DIMENSION})`).notNullable();
        table.text('entity_type').notNullable(); // e.g., 'collection', 'file'
        table.uuid('entity_id').notNullable(); // FK to collections.id or files.id
        table.timestamps(true, true);
        
        // Indexes
        table.index('user_id');
        table.index(['entity_type', 'entity_id']);
      });

      // Create HNSW index for vector similarity search
      await knex.raw(`
        CREATE INDEX ${TABLE_NAME}_embedding_hnsw_idx 
        ON ${TABLE_NAME} USING hnsw (embedding vector_cosine_ops);
      `);

      console.log(`Created table ${TABLE_NAME} with vector dimension ${VECTOR_DIMENSION}`);
    });
  },

  down: async function down(knex: Knex): Promise<void> {
    return knex.transaction(async (trx) => {
      await trx.schema.dropTableIfExists(TABLE_NAME);
    });
  }
};
