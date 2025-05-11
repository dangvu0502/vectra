// Centralized constants for the server application

export const ARANGO_COLLECTION_NAMES = {
  NODES: 'vb_nodes',
  EDGES: 'vb_edges',
} as const;

export const API_VERSION = 'v1';
export const BASE_PATH = '/api';
export const DOCUMENTS_PATH = 'documents';
export const FILES_PATH = 'files';
export const PREFIX = `${BASE_PATH}/${API_VERSION}/${DOCUMENTS_PATH}`;
export const FILES_PREFIX = `${BASE_PATH}/${API_VERSION}/${FILES_PATH}`;

export const MAX_RESULTS = 10;
export const MIN_SIMILARITY_THRESHOLD = 0.2;

export const TEST_USER_ID = '00000000-0000-4000-a000-000000000001';

export const VECTOR_DIMENSION = 768;

export const DEFAULT_PORT = 3000;
