import config from '@/config/database';
import { env } from '@/config/environment';
import knex from 'knex';

export const db = knex(config[env.NODE_ENV]);

// Initialization and connection testing are now handled in bootstrap.ts
// Remove initializeDatabase function
