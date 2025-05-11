import type { Knex } from 'knex';
import { PG_TABLE_NAMES } from '../../constants';

export const users_schema = {
  up: async function up(knex: Knex): Promise<void> {
    return knex.transaction(async (trx) => {
      await trx.schema.createTable(PG_TABLE_NAMES.USERS, (table) => {
        table.uuid('id').primary();
        table.string('provider').notNullable();
        table.string('provider_id').notNullable();
        table.string('email').notNullable();
        table.string('display_name');
        table.string('profile_picture_url');
        table.timestamps(true, true);
      });

      await trx.schema.raw(
        `CREATE UNIQUE INDEX provider_id_idx ON ${PG_TABLE_NAMES.USERS} (provider, provider_id)`
      );
    });
  },

  down: async function down(knex: Knex): Promise<void> {
    return knex.transaction(async (trx) => {
      // First drop all foreign key constraints referencing users table
      if (await trx.schema.hasTable(PG_TABLE_NAMES.COLLECTIONS)) {
        await trx.schema.alterTable(PG_TABLE_NAMES.COLLECTIONS, (table) => {
          table.dropForeign(['user_id']);
        });
      }

      if (await trx.schema.hasTable(PG_TABLE_NAMES.FILES)) {
        await trx.schema.alterTable(PG_TABLE_NAMES.FILES, (table) => {
          table.dropForeign(['user_id']);
        });
      }

      // Then drop the users table
      await trx.schema.dropTable(PG_TABLE_NAMES.USERS);
    });
  }
};
