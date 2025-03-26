import knex from 'knex';
import { knexConfig } from '../config/database';

export const db = knex(knexConfig);

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