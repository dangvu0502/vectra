// Test user ID used in seeds and tests
export const TEST_USER_ID = '00000000-0000-4000-a000-000000000001';

/**
 * PostgreSQL Table Names
 */
export const PG_TABLE_NAMES = {
  USERS: 'users',
  COLLECTIONS: 'collections',
  FILES: 'files',
  TEXT_EMBEDDINGS: 'text_embeddings',
  COLLECTION_FILES: 'collection_files', // Join table
} as const; // Use 'as const' for stricter typing
