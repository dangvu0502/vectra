import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("users", (table) => {
    table.uuid("id").primary();
    table.string("provider").notNullable();
    table.string("provider_id").notNullable();
    table.string("email").notNullable();
    table.string("display_name");
    table.string("profile_picture_url");
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
  });

  // Add unique index for provider and provider_id
  await knex.schema.raw(
    `CREATE UNIQUE INDEX provider_id_idx ON users (provider, provider_id)`
  );
}

export const down = async function (knex: Knex): Promise<void> {
  // Drop the users table (this will automatically drop associated indexes)
  await knex.schema.dropTableIfExists("users");
};
