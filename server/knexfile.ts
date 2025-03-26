import type { Knex } from 'knex';
import { env } from './src/config/environment';

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'pg',
    connection: env.DATABASE_URL,
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: './src/database/migrations',
      extension: 'ts'
    },
    seeds: {
      directory: './src/database/seeds',
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
      directory: './src/database/migrations',
      extension: 'ts'
    }
  },

  production: {
    client: 'pg',
    connection: env.DATABASE_URL,
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: './src/database/migrations',
      extension: 'ts'
    }
  }
};

export default config; 