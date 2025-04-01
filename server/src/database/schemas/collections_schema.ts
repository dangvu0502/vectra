import type { Knex } from 'knex';

const TABLE_NAME = 'collections';

export const collections_schema = {
  up: async function up(knex: Knex): Promise<void> {
    return knex.transaction(async (trx) => {
      // Verify users table exists first
      const hasUsers = await trx.schema.hasTable('users');
      if (!hasUsers) throw new Error('users table must exist first');

      await trx.schema.createTable(TABLE_NAME, (table) => {
        table.uuid('id').primary().defaultTo(knex.fn.uuid());
        table.string('name').notNullable();
        table.text('description');
        table.uuid('user_id').notNullable().references('users.id').onDelete('CASCADE');
        table.timestamps(true, true);
        
        // Add composite index on (user_id, name) for efficient lookups
        table.index(['user_id', 'name']);
        
        // Add unique constraint to ensure names are unique per user
        table.unique(['user_id', 'name']);
      });
      
      console.log(`Created table ${TABLE_NAME} with composite index and unique constraint`);
    });
  },

  down: async function down(knex: Knex): Promise<void> {
    return knex.transaction(async (trx) => {
      if (await trx.schema.hasTable(TABLE_NAME)) {
        await trx.schema.dropTable(TABLE_NAME);
      }
    });
  }
}
