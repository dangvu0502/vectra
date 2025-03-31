import { z } from 'zod';

export const API_VERSION = 'v1';
export const BASE_PATH = '/api';
export const DOCUMENTS_PATH = 'documents';
export const FILES_PATH = 'files';
export const PREFIX = `${BASE_PATH}/${API_VERSION}/${DOCUMENTS_PATH}`;
export const FILES_PREFIX = `${BASE_PATH}/${API_VERSION}/${FILES_PATH}`;

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


/**
 * Core document module configuration
 */
export const DocumentConfig = {
  api: {
    version: 'v1',
    basePath: '/api',
    documentsPath: 'documents',
    get prefix() {
      return `${this.basePath}/${this.version}/${this.documentsPath}`;
    }
  },
  upload: {
    directory: 'uploads',
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },
  pagination: {
    defaultLimit: 10,
    maxLimit: 100,
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'desc' as const
  }
};

/**
 * Core file module configuration
 */
export const FileConfig = {
  api: {
    version: 'v1',
    basePath: '/api',
    filesPath: 'files',
    get prefix() {
      return `${this.basePath}/${this.version}/${this.filesPath}`;
    }
  },
  upload: {
    directory: 'uploads',
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },
  pagination: {
    defaultLimit: 10,
    maxLimit: 100,
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'desc' as const
  }
};

/**
 * Embedding configuration schema
 */
export const EmbeddingConfigSchema = z.object({
  model: z.string().default('text-embedding-3-small'),
  dimensions: z.number().default(384),
  chunkSize: z.number().optional(),
  overlapSize: z.number().optional()
});

export type EmbeddingConfig = z.infer<typeof EmbeddingConfigSchema>;

/**
 * Document module configuration schema
 */
export const DocumentModuleConfigSchema = z.object({
  embedding: EmbeddingConfigSchema.optional(),
  storage: z.any().optional(), // StorageProvider type
  middleware: z.array(z.any()).optional() // PipelineMiddleware[] type
});

export type DocumentModuleConfig = z.infer<typeof DocumentModuleConfigSchema>;

/**
 * File module configuration schema
 */
export const FileModuleConfigSchema = z.object({
  embedding: EmbeddingConfigSchema.optional(),
  storage: z.any().optional(), // StorageProvider type
  middleware: z.array(z.any()).optional() // PipelineMiddleware[] type
});

export type FileModuleConfig = z.infer<typeof FileModuleConfigSchema>;

/**
 * Validate and process document configuration
 */
export function validateConfig(config: Partial<DocumentModuleConfig> = {}): DocumentModuleConfig {
  return DocumentModuleConfigSchema.parse(config);
}

/**
 * Validate and process file configuration
 */
export function validateFileConfig(config: Partial<FileModuleConfig> = {}): FileModuleConfig {
  return FileModuleConfigSchema.parse(config);
}
