export const API_VERSION = 'v1';
export const BASE_PATH = '/api';
export const DOCUMENTS_PATH = 'documents';
export const PREFIX = `${BASE_PATH}/${API_VERSION}/${DOCUMENTS_PATH}`;

export const DEFAULT_CONFIG = {
  uploadDir: 'uploads',
  maxFileSize: 10 * 1024 * 1024,
  pagination: {
    defaultLimit: 10,
    maxLimit: 100,
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'desc' as const
  }
};