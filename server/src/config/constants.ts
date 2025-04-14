// Centralized constants for the server application

// ArangoDB Collection Names
export const ARANGO_COLLECTION_NAMES = {
  NODES: 'vb_nodes',
  EDGES: 'vb_edges',
} as const;

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
export const VECTOR_DIMENSION = 768;

// Default Ports
export const DEFAULT_PORT = 3000;
