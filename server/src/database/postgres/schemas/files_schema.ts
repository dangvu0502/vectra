import type { Knex } from 'knex';
import { PG_TABLE_NAMES } from '../../constants';

export const files_schema = {
  up: async function up(knex: Knex): Promise<void> {
    return knex.transaction(async (trx) => {
      // Files depend on users table for user_id foreign key
      const hasUsers = await trx.schema.hasTable(PG_TABLE_NAMES.USERS);
      if (!hasUsers) throw new Error(`Table "${PG_TABLE_NAMES.USERS}" must exist first`);

      await trx.schema.createTable(PG_TABLE_NAMES.FILES, (table) => {
        table.uuid('id').primary();
        table.string('filename').notNullable();
        table.string('path').notNullable();
        table.text('content').notNullable();
        table.uuid('user_id').notNullable().references('id').inTable(PG_TABLE_NAMES.USERS).onDelete('CASCADE');
        table.jsonb('metadata').notNullable();
        table.timestamps(true, true);
      });

      await trx.schema.raw(`CREATE INDEX files_content_idx ON ${PG_TABLE_NAMES.FILES} USING gin(to_tsvector('english', content))`);
    });
  },

  down: async function down(knex: Knex): Promise<void> {
    return knex.transaction(async (trx) => {
      // Drop dependent tables first (e.g., collection_files) - This should be handled by the migration order or down function of collection_files
      if (await trx.schema.hasTable(PG_TABLE_NAMES.FILES)) {
        await trx.schema.dropTable(PG_TABLE_NAMES.FILES);
      }
    });
  }
};
