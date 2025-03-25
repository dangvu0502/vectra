export const up = async (knex) => {
  return knex.schema.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";').then(() => {
    return knex.schema.createTable('users', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('provider').notNullable();
      table.string('provider_id').notNullable();
      table.string('email').notNullable();
      table.string('display_name');
      table.string('profile_picture_url');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    }).then(() => {
      return knex.schema.raw(
        `CREATE UNIQUE INDEX provider_id_idx ON users (provider, provider_id)`
      );
    });
  });
};


export const down = async function (knex) {
}
