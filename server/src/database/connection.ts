import config from '@/config/database';
import { env } from '@/config/environment';
import knex from 'knex';

export const db = knex(config[env.NODE_ENV]);

export const initializeDatabase = async () => {
  try {
    // Test the connection
    await db.raw('SELECT 1');
    console.log('✅ Database connection established');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}; 