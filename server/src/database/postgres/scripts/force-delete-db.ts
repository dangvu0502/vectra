import { db } from '../connection'; // Adjusted path: from ../database/connection
import type { Knex } from 'knex';

// List of tables managed by your schemas, in a reasonable order for dropping
// (though CASCADE should handle dependencies)
const TABLES_TO_DROP = [
  'text_embeddings', // Depends on users, files, collections (indirectly via collection_files)
  'collection_files', // Depends on collections, files
  'files',            // Depends on users
  'collections',      // Depends on users
  'users',            // Base table
  // Include Knex migration tables if you want a full reset
  'knex_migrations',
  'knex_migrations_lock'
];

// Specific partitions for text_embeddings
const TEXT_EMBEDDING_PARTITIONS = [
  'text_embeddings_part_0',
  'text_embeddings_part_1',
  'text_embeddings_part_2',
  'text_embeddings_part_3'
];

async function forceDeleteDatabase(dbInstance: Knex): Promise<void> {
  console.warn('!!! EXECUTING FORCE DELETE DATABASE SCRIPT !!!');
  
  // Drop partitions first
  for (const partitionName of TEXT_EMBEDDING_PARTITIONS) {
    try {
      await dbInstance.raw(`DROP TABLE IF EXISTS ?? CASCADE;`, [partitionName]);
      console.log(`Force dropped partition table: ${partitionName}`);
    } catch (error) {
      console.error(`Error dropping partition table ${partitionName}:`, error);
      // Decide if you want to stop or continue on error
    }
  }

  // Drop main tables
  for (const tableName of TABLES_TO_DROP) {
    try {
      // Using knex.raw to easily use CASCADE
      await dbInstance.raw(`DROP TABLE IF EXISTS ?? CASCADE;`, [tableName]);
      console.log(`Force dropped table: ${tableName}`);
    } catch (error) {
      console.error(`Error dropping table ${tableName}:`, error);
      // Decide if you want to stop or continue on error
    }
  }
  
  // Optionally drop extensions if needed, be careful with this
  // await dbInstance.raw(`DROP EXTENSION IF EXISTS vector;`);
  // console.log('Dropped vector extension');

  console.warn('!!! FORCE DELETE DATABASE SCRIPT COMPLETE !!!');
}

// Main execution block
(async () => {
  // Add a confirmation step or command-line argument check for safety
  const forceArg = process.argv.includes('--force');
  if (!forceArg) {
      console.error('ERROR: This script is destructive. Run with --force flag to confirm execution.');
      // Adjust example path for the new location
      console.error('Example: ts-node server/src/database/scripts/force-delete-db.ts --force'); 
      process.exit(1);
  }

  console.log('Proceeding with force delete...');
  try {
    await forceDeleteDatabase(db); // Use the imported 'db' instance
  } catch (error) {
    console.error('Force delete script failed.');
    process.exit(1); // Exit with error code
  } finally {
    await db.destroy(); // Ensure the connection is closed
    console.log('Database connection closed.');
  }
})();
