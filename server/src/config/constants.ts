// Centralized constants for the server application

// Database Table Names
export const FILES_TABLE = 'files';
export const TEXT_EMBEDDINGS_TABLE = 'text_embeddings';
export const KNOWLEDGE_METADATA_INDEX_TABLE = 'knowledge_metadata_index';
export const COLLECTIONS_TABLE = 'collections';

// API Configuration
export const API_VERSION = 'v1';
export const BASE_PATH = '/api';
export const DOCUMENTS_PATH = 'documents';
export const FILES_PATH = 'files';
export const PREFIX = `${BASE_PATH}/${API_VERSION}/${DOCUMENTS_PATH}`;
export const FILES_PREFIX = `${BASE_PATH}/${API_VERSION}/${FILES_PATH}`;

// Knowledge Service
export const MAX_RESULTS = 10;
export const MIN_SIMILARITY_THRESHOLD = 0.2;

// Test User
export const TEST_USER_ID = '00000000-0000-4000-a000-000000000001';

// Vector Dimension
export const VECTOR_DIMENSION = 1536;

// Default Ports
export const DEFAULT_PORT = 3000;
