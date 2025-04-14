# Database Module (`src/database`)

This directory contains all database-related files for the Vectra server, primarily focusing on the PostgreSQL database managed by Knex.

## Purpose

To manage the database schema, initial data seeding, connection handling, and any database-specific scripts or constants.

## Structure & Key Files

- **`connection.ts`**:
    - Initializes and exports the Knex instance used throughout the application for interacting with the PostgreSQL database. It likely uses configuration from `knexfile.ts` and `src/config/environment.ts`.

- **`constants.ts`**:
    - **Purpose:** Defines constants specifically related to the database schema.
    - **Examples:** Table names, column names, enum values used within the database.
    - **Refactor Goal:** Centralize all table/column names used in migrations, seeds, and queries here.

- **`migrations/`**:
    - Contains Knex migration files (written in TypeScript).
    - Each file represents a step in evolving the database schema (e.g., creating tables, adding columns, modifying constraints).
    - Migrations are run using `pnpm run migrate:latest`, `pnpm run migrate:rollback`, etc. (See root `package.json`).
    - **Refactor Goal:** Ensure all table/column names used here are imported from `database/constants.ts`. Add comments explaining the purpose of each migration.

- **`schemas/`**:
    - Contains schema definitions, potentially used for validation or ORM-like features if applicable (though the project seems to use Knex primarily as a query builder). Could also contain Zod schemas for database types.

- **`scripts/`**:
    - Contains utility scripts for database management tasks beyond standard migrations/seeds.
    - **Examples:** `orchestrate-db.ts` (likely sets up the schema, possibly by running migrations), `force-delete-db.ts` (for development/testing, drops the database).
    - These scripts are typically run via `pnpm run ...` commands defined in `package.json`.

- **`seeds/`**:
    - Contains Knex seed files (written in TypeScript).
    - Used to populate the database with initial or default data (e.g., default user roles, initial settings).
    - Seeds are run using `pnpm run seed:run`.
    - **Refactor Goal:** Ensure all table/column names used here are imported from `database/constants.ts`. Add comments explaining the purpose of each seed file.

## Workflow

- **Schema Changes:** Create a new migration file using `pnpm run migrate:make <migration_name>`. Edit the generated file to define the schema changes using the Knex schema builder API. Apply the migration using `pnpm run migrate:latest`.
- **Seeding Data:** Create a new seed file using `pnpm run seed:make <seed_name>`. Edit the generated file to insert data using the Knex query builder. Run seeds using `pnpm run seed:run`.
- **Setup/Reset:** Use `pnpm run db:setup` to orchestrate the database creation and seeding. Use `pnpm run db:reset` to force-delete and then set up the database (useful for development).
