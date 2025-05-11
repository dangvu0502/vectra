import { collections_schema, files_schema, text_embeddings_schema, users_schema } from '../schemas';
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.transaction(async (trx) => {
    await users_schema.up(trx);
    await collections_schema.up(trx);
    await files_schema.up(trx);
    await text_embeddings_schema.up(trx);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.transaction(async (trx) => {
    await text_embeddings_schema.down(trx);
    await files_schema.down(trx);
    await collections_schema.down(trx);
    await users_schema.down(trx);
  });
}
