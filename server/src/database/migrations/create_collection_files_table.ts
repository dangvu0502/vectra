import type { Knex } from 'knex';

const TABLE_NAME = 'collection_files';

export async function up(knex: Knex): Promise<void> {
  // Check if dependent tables exist
  const hasFiles = await knex.schema.hasTable('files');
  const hasCollections = await knex.schema.hasTable('collections');

  if (!hasFiles || !hasCollections) {
    throw new Error('Both "files" and "collections" tables must exist before creating "collection_files".');
  }

  // Create the join table
  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.uuid('collection_id')
      .notNullable()
      .references('id')
      .inTable('collections')
      .onDelete('CASCADE'); // If a collection is deleted, remove its file links

    table.uuid('file_id')
      .notNullable()
      .references('id')
      .inTable('files')
      .onDelete('CASCADE'); // If a file is deleted, remove its collection links

    // Composite primary key to ensure uniqueness of pairs
    table.primary(['collection_id', 'file_id']);

    // Optional: Add user_id if needed for ownership checks directly on this table,
    // though ownership can usually be inferred via the linked collection/file.
    // table.uuid('user_id').notNullable().references('users.id').onDelete('CASCADE');

    table.timestamps(true, true); // Add created_at and updated_at

    console.log(`Created join table ${TABLE_NAME}`);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(TABLE_NAME);
  console.log(`Dropped join table ${TABLE_NAME}`);
}
