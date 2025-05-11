import type { Knex } from 'knex';
import { PG_TABLE_NAMES } from '../../constants';

export const collections_schema = {
  up: async function up(knex: Knex): Promise<void> {
    return knex.transaction(async (trx) => {
      const hasUsers = await trx.schema.hasTable(PG_TABLE_NAMES.USERS);
      if (!hasUsers) throw new Error(`Table "${PG_TABLE_NAMES.USERS}" must exist first`);

      await trx.schema.createTable(PG_TABLE_NAMES.COLLECTIONS, (table) => {
        table.uuid('id').primary().defaultTo(knex.fn.uuid());
        table.string('name').notNullable();
        table.text('description');
        table.uuid('user_id').notNullable().references('id').inTable(PG_TABLE_NAMES.USERS).onDelete('CASCADE');
        table.timestamps(true, true);
        
        table.index(['user_id', 'name']);
        
        // Add unique constraint to ensure names are unique per user
        table.unique(['user_id', 'name']);
      });

      console.log(`Created table ${PG_TABLE_NAMES.COLLECTIONS} with composite index and unique constraint`);
    });
  },

  down: async function down(knex: Knex): Promise<void> {
    return knex.transaction(async (trx) => {
      if (await trx.schema.hasTable(PG_TABLE_NAMES.COLLECTIONS)) {
        await trx.schema.dropTable(PG_TABLE_NAMES.COLLECTIONS);
      }
    });
  }
}
