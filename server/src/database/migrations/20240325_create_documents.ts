import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('documents', (table) => {
    table.uuid('id').primary();
    table.string('filename').notNullable();
    table.string('path').notNullable();
    table.text('content').notNullable();
    table.jsonb('metadata').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // Add indexes
  await knex.schema.raw('CREATE INDEX documents_content_idx ON documents USING gin(to_tsvector(\'english\', content))');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('documents');
  await knex.schema.raw('DROP INDEX IF EXISTS documents_content_idx');
} 