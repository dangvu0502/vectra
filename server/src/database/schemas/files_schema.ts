import type { Knex } from 'knex';

export const files_schema = {
  up: async function up(knex: Knex): Promise<void> {
    return knex.transaction(async (trx) => {
      // Verify collections table exists first
      const hasCollections = await trx.schema.hasTable('collections');
      if (!hasCollections) throw new Error('collections table must exist first');
      
      await trx.schema.createTable('files', (table) => {
        table.uuid('id').primary();
        table.string('filename').notNullable();
        table.string('path').notNullable();
        table.text('content').notNullable();
        table.uuid('collection_id').references('collections.id').onDelete('SET NULL');
        table.uuid('user_id').notNullable().references('users.id').onDelete('CASCADE');
        table.jsonb('metadata').notNullable();
        table.timestamps(true, true);
      });

      // Add indexes
      await trx.schema.raw('CREATE INDEX files_content_idx ON files USING gin(to_tsvector(\'english\', content))');
    });
  },

  down: async function down(knex: Knex): Promise<void> {
    return knex.transaction(async (trx) => {
      if (await trx.schema.hasTable('files')) {
        await trx.schema.dropTable('files');
      }
    });
  }
};
