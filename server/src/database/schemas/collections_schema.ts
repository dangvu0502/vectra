import type { Knex } from 'knex';

export const collections_schema = {
  up: async function up(knex: Knex): Promise<void> {
    return knex.transaction(async (trx) => {
      // Verify users table exists first
      const hasUsers = await trx.schema.hasTable('users');
      if (!hasUsers) throw new Error('users table must exist first');

      await trx.schema.createTable('collections', (table) => {
        table.uuid('id').primary().defaultTo(knex.fn.uuid());
        table.string('name').notNullable();
        table.text('description');
        table.uuid('user_id').notNullable().references('users.id').onDelete('CASCADE');
        table.timestamps(true, true);
      });
    });
  },

  down: async function down(knex: Knex): Promise<void> {
    return knex.transaction(async (trx) => {
      if (await trx.schema.hasTable('collections')) {
        await trx.schema.dropTable('collections');
      }
    });
  }
}
