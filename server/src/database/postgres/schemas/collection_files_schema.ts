import type { Knex } from 'knex';

const TABLE_NAME = 'collection_files';

export const collection_files_schema = {
  up: async function up(knex: Knex): Promise<void> {
    return knex.transaction(async (trx) => {
      // Verify dependent tables exist first
      const hasCollections = await trx.schema.hasTable('collections');
      const hasFiles = await trx.schema.hasTable('files');
      if (!hasCollections) throw new Error('collections table must exist first');
      if (!hasFiles) throw new Error('files table must exist first');

      await trx.schema.createTable(TABLE_NAME, (table) => {
        table.uuid('collection_id').notNullable().references('collections.id').onDelete('CASCADE');
        table.uuid('file_id').notNullable().references('files.id').onDelete('CASCADE');
        table.timestamps(true, true);

        // Add primary key constraint on (collection_id, file_id)
        table.primary(['collection_id', 'file_id']);

        // Add indexes for efficient lookups
        table.index(['collection_id']);
        table.index(['file_id']);
      });

      console.log(`Created table ${TABLE_NAME} with primary key and indexes`);
    });
  },

  down: async function down(knex: Knex): Promise<void> {
    return knex.transaction(async (trx) => {
      if (await trx.schema.hasTable(TABLE_NAME)) {
        await trx.schema.dropTable(TABLE_NAME);
      }
    });
  }
};
