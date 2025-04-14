# Configuration Module (`src/config`)

This directory centralizes configuration settings and constants for the Vectra server application.

## Purpose

The goal is to keep configuration separate from application logic, making the application easier to manage, deploy, and modify across different environments.

## Key Files

- **`constants.ts`**:
    - **Purpose:** Defines application-wide constants that are unlikely to change between environments but are used in multiple places in the code.
    - **Examples:** Database table names, collection names (for ArangoDB), default values, fixed limits, specific string literals used across modules.
    - **Refactor Goal:** Consolidate all hardcoded table/collection names and similar constants here to avoid magic strings/numbers in the codebase.

- **`database.ts`**:
    - **Purpose:** Contains configuration specifically related to database connections (primarily Knex/Postgres in the current setup, but could be extended). It might initialize and export the Knex connection instance.
    - **Note:** The main Knex configuration (`knexfile.ts`) resides in the project root, but this file might handle the runtime connection setup based on the environment.

- **`environment.ts`**:
    - **Purpose:** Loads, validates (using Zod), and exports environment variables from the `.env` file.
    - **Functionality:** Provides a type-safe way to access environment variables throughout the application, ensuring that required variables are present and potentially coercing types. It prevents direct access to `process.env` elsewhere in the application.

## Usage

Modules should import necessary constants or the environment configuration object from this directory instead of defining them locally or accessing `process.env` directly.

Example:
```typescript
// Instead of: const tableName = 'users';
import { TABLE_NAMES } from '@/config/constants';
const tableName = TABLE_NAMES.USERS;

// Instead of: const dbUrl = process.env.DATABASE_URL;
import { env } from '@/config/environment';
const dbUrl = env.DATABASE_URL;
