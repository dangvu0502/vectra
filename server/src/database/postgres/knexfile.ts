import type { Knex } from 'knex';
import { env } from '../../config/environment';

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'pg',
    connection: env.DATABASE_URL,
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: './migrations', // Corrected path
      disableMigrationsListValidation: true,
      loadExtensions: ['.ts'],
      schemaName: 'public',
      tableName: 'knex_migrations',
      disableTransactions: false,
      extension: 'ts'
    },
    seeds: {
      directory: './seeds', // Corrected path
      extension: 'ts'
    }
  },

  test: {
    client: 'pg',
    connection: env.DATABASE_URL,
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: './migrations', // Corrected path
      disableMigrationsListValidation: true,
      loadExtensions: ['.ts'],
      schemaName: 'public',
      tableName: 'knex_migrations',
      disableTransactions: false,
      extension: 'ts'
    },
    // Assuming seeds might be added to test later, good to be consistent
    // seeds: { directory: './seeds', extension: 'ts' } 
  },

  production: {
    client: 'pg',
    connection: env.DATABASE_URL,
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: './migrations', // Corrected path
      disableMigrationsListValidation: true,
      loadExtensions: ['.ts'],
      schemaName: 'public',
      tableName: 'knex_migrations',
      disableTransactions: false,
      extension: 'ts'
    }
  }
};

export default config;
