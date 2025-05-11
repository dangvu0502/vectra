import type { Knex } from 'knex';
import { PG_TABLE_NAMES } from '../../constants';

export const api_keys_schema = {
  up: async function up(knex: Knex): Promise<void> {
    return knex.transaction(async (trx) => {
      await trx.schema.createTable(PG_TABLE_NAMES.API_KEYS, (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('user_id').notNullable().references('id').inTable(PG_TABLE_NAMES.USERS).onDelete('CASCADE');
        table.string('name').notNullable();
        table.string('key').notNullable().unique();
        table.boolean('is_active').notNullable().defaultTo(true);
        table.timestamp('last_used_at').nullable();
        table.timestamps(true, true);
      });

      // Add index for faster lookups by user_id
      await trx.schema.raw(
        `CREATE INDEX user_id_idx ON ${PG_TABLE_NAMES.API_KEYS} (user_id)`
      );
    });
  },

  down: async function down(knex: Knex): Promise<void> {
    return knex.transaction(async (trx) => {
      await trx.schema.dropTable(PG_TABLE_NAMES.API_KEYS);
    });
  }
};
