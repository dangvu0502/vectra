import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('files', (table) => {
    table.uuid('id').primary();
    table.string('filename').notNullable();
    table.string('path').notNullable();
    table.text('content').notNullable();
    table.uuid('collection_id').references('collections.id').onDelete('SET NULL');
    table.uuid('user_id').notNullable().references('users.id').onDelete('CASCADE');
    table.jsonb('metadata').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // Add indexes
  await knex.schema.raw('CREATE INDEX files_content_idx ON files USING gin(to_tsvector(\'english\', content))');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('files', (table) => {
    table.dropForeign('user_id');
  });
  await knex.schema.dropTable('files');
  await knex.schema.raw('DROP INDEX IF EXISTS files_content_idx');
}
