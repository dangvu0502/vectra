import type { Knex } from 'knex';

export const users_schema = {
  up: async function up(knex: Knex): Promise<void> {
    return knex.transaction(async (trx) => {
      await trx.schema.createTable('users', (table) => {
        table.uuid('id').primary();
        table.string('provider').notNullable();
        table.string('provider_id').notNullable();
        table.string('email').notNullable();
        table.string('display_name');
        table.string('profile_picture_url');
        table.timestamps(true, true);
      });

      // Add unique index for provider and provider_id
      await trx.schema.raw(
        `CREATE UNIQUE INDEX provider_id_idx ON users (provider, provider_id)`
      );
    });
  },

  down: async function down(knex: Knex): Promise<void> {
    return knex.transaction(async (trx) => {
      // First drop all foreign key constraints referencing users table
      if (await trx.schema.hasTable('collections')) {
        await trx.schema.alterTable('collections', (table) => {
          table.dropForeign(['user_id']);
        });
      }
      
      if (await trx.schema.hasTable('files')) {
        await trx.schema.alterTable('files', (table) => {
          table.dropForeign(['user_id']);
        });
      }
      
      // Then drop the users table
      await trx.schema.dropTable('users');
    });
  }
};
