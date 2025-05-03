import { collections_schema, files_schema, text_embeddings_schema, users_schema } from '@/database/schemas'; // Removed knowledge_metadata_index_schema
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.transaction(async (trx) => {
    // Run migrations in proper order with dependency checks
    await users_schema.up(trx);
    await collections_schema.up(trx);
    await files_schema.up(trx);
    await text_embeddings_schema.up(trx);
    // Removed await knowledge_metadata_index_schema.up(trx);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.transaction(async (trx) => {
    // Run down migrations in reverse order
    // Removed await knowledge_metadata_index_schema.down(trx);
    await text_embeddings_schema.down(trx);
    await files_schema.down(trx);
    await collections_schema.down(trx);
    await users_schema.down(trx);
  });
}
