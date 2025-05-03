import { db } from '../connection'; 
import { users_schema } from '../schemas/users_schema'; 
import { collections_schema } from '../schemas/collections_schema'; 
import { files_schema } from '../schemas/files_schema'; 
import { collection_files_schema } from '../schemas/collection_files_schema'; 
import { text_embeddings_schema } from '../schemas/text_embeddings_schema'; 
import { api_keys_schema } from '../schemas/api_keys_schema'; 
import type { Knex } from 'knex';

async function orchestrateDatabase(db: Knex): Promise<void> {
  console.log('Starting database orchestration...');

  // Execute schema creation in dependency order
  // Note: The original schema files contain transaction logic and checks.
  // We'll call their 'up' methods directly to reuse that logic.

  try {
    if (!(await db.schema.hasTable('users'))) {
      console.log('Applying users schema...');
      await users_schema.up(db);
    } else {
      console.log('Skipping users schema (table already exists).');
    }

    if (!(await db.schema.hasTable('collections'))) {
      console.log('Applying collections schema...');
      await collections_schema.up(db);
    } else {
      console.log('Skipping collections schema (table already exists).');
    }

    if (!(await db.schema.hasTable('files'))) {
      console.log('Applying files schema...');
      await files_schema.up(db);
    } else {
      console.log('Skipping files schema (table already exists).');
    }

    if (!(await db.schema.hasTable('collection_files'))) {
      console.log('Applying collection_files schema...');
      await collection_files_schema.up(db);
    } else {
      console.log('Skipping collection_files schema (table already exists).');
    }

    if (!(await db.schema.hasTable('api_keys'))) {
      console.log('Applying api_keys schema...');
      await api_keys_schema.up(db);
    } else {
      console.log('Skipping api_keys schema (table already exists).');
    }
    
    // text_embeddings schema likely checks for dependent tables internally, 
    // but we add the primary table check for consistency in this script.
    // The internal 'up' function also handles partition creation.
    if (!(await db.schema.hasTable('text_embeddings'))) {
       console.log('Applying text_embeddings schema...');
       await text_embeddings_schema.up(db);
    } else {
       console.log('Skipping text_embeddings schema (table already exists).');
    }


    console.log('Database orchestration check completed.');

  } catch (error) {
    console.error('Error during database orchestration:', error);
    // Consider adding more specific error handling if needed
    throw error; // Re-throw error to indicate failure
  }
}

// Main execution block
(async () => {
  try {
    await orchestrateDatabase(db); // Use 'db' here
  } catch (error) {
    console.error('Orchestration script failed.');
    process.exit(1); // Exit with error code
  } finally {
    await db.destroy(); // Ensure the connection is closed using 'db'
    console.log('Database connection closed.');
  }
})();
