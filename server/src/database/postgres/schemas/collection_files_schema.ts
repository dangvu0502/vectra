import type { Knex } from 'knex';
import { PG_TABLE_NAMES } from '../../constants';

export const collection_files_schema = {
  up: async function up(knex: Knex): Promise<void> {
    return knex.transaction(async (trx) => {
      const hasCollections = await trx.schema.hasTable(PG_TABLE_NAMES.COLLECTIONS);
      const hasFiles = await trx.schema.hasTable(PG_TABLE_NAMES.FILES);
      if (!hasCollections) throw new Error(`Table "${PG_TABLE_NAMES.COLLECTIONS}" must exist first`);
      if (!hasFiles) throw new Error(`Table "${PG_TABLE_NAMES.FILES}" must exist first`);

      await trx.schema.createTable(PG_TABLE_NAMES.COLLECTION_FILES, (table) => {
        table.uuid('collection_id').notNullable().references('id').inTable(PG_TABLE_NAMES.COLLECTIONS).onDelete('CASCADE');
        table.uuid('file_id').notNullable().references('id').inTable(PG_TABLE_NAMES.FILES).onDelete('CASCADE');
        table.timestamps(true, true);

        table.primary(['collection_id', 'file_id']);

        table.index(['collection_id']);
        table.index(['file_id']);
      });

      console.log(`Created table ${PG_TABLE_NAMES.COLLECTION_FILES} with primary key and indexes`);
    });
  },

  down: async function down(knex: Knex): Promise<void> {
    return knex.transaction(async (trx) => {
      if (await trx.schema.hasTable(PG_TABLE_NAMES.COLLECTION_FILES)) {
        await trx.schema.dropTable(PG_TABLE_NAMES.COLLECTION_FILES);
      }
    });
  }
};
