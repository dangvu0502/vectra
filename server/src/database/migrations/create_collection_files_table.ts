import type { Knex } from 'knex';
import { PG_TABLE_NAMES } from '../constants';

// const TABLE_NAME = 'collection_files'; // Removed, use constant

export async function up(knex: Knex): Promise<void> {
  // Check if dependent tables exist
  const hasFiles = await knex.schema.hasTable(PG_TABLE_NAMES.FILES);
  const hasCollections = await knex.schema.hasTable(PG_TABLE_NAMES.COLLECTIONS);

  if (!hasFiles || !hasCollections) {
    throw new Error(`Both "${PG_TABLE_NAMES.FILES}" and "${PG_TABLE_NAMES.COLLECTIONS}" tables must exist before creating "${PG_TABLE_NAMES.COLLECTION_FILES}".`);
  }

  // Create the join table
  await knex.schema.createTable(PG_TABLE_NAMES.COLLECTION_FILES, (table) => {
    table.uuid('collection_id')
      .notNullable()
      .references('id')
      .inTable(PG_TABLE_NAMES.COLLECTIONS)
      .onDelete('CASCADE'); // If a collection is deleted, remove its file links

    table.uuid('file_id')
      .notNullable()
      .references('id')
      .inTable(PG_TABLE_NAMES.FILES)
      .onDelete('CASCADE'); // If a file is deleted, remove its collection links

    // Composite primary key to ensure uniqueness of pairs
    table.primary(['collection_id', 'file_id']);

    // Optional: Add user_id if needed for ownership checks directly on this table,
    // though ownership can usually be inferred via the linked collection/file.
    // table.uuid('user_id').notNullable().references('users.id').onDelete('CASCADE');

    table.timestamps(true, true); // Add created_at and updated_at

    console.log(`Created join table ${PG_TABLE_NAMES.COLLECTION_FILES}`);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(PG_TABLE_NAMES.COLLECTION_FILES);
  console.log(`Dropped join table ${PG_TABLE_NAMES.COLLECTION_FILES}`);
}
