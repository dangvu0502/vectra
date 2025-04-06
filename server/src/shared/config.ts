import { z } from 'zod';

// General API Constants
export const API_VERSION = 'v1';
export const BASE_PATH = '/api';
export const DOCUMENTS_PATH = 'documents'; // Kept for DocumentConfig
export const FILES_PATH = 'files'; // Kept for reference, used in FileConfig

// Default configurations (can be shared or moved if specific modules need overrides)
export const DEFAULT_CONFIG = {
  uploadDir: 'uploads',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  pagination: {
    defaultLimit: 10,
    maxLimit: 100,
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'desc' as const
  }
};

/**
 * Embedding configuration schema (Shared)
 */
export const EmbeddingConfigSchema = z.object({
  model: z.string().default('text-embedding-3-small'),
  dimensions: z.number().default(384),
  chunkSize: z.number().optional(),
  overlapSize: z.number().optional()
});

export type EmbeddingConfig = z.infer<typeof EmbeddingConfigSchema>;

/**
 * Core document module configuration (Keeping here for now, could be moved to a potential 'document' module later)
 */
export const DocumentConfig = {
  api: {
    version: API_VERSION,
    basePath: BASE_PATH,
    documentsPath: DOCUMENTS_PATH,
    get prefix() {
      return `${this.basePath}/${this.version}/${this.documentsPath}`;
    }
  },
  upload: {
    directory: DEFAULT_CONFIG.uploadDir,
    maxFileSize: DEFAULT_CONFIG.maxFileSize,
  },
  pagination: DEFAULT_CONFIG.pagination
};

/**
 * Document module configuration schema (Keeping here for now)
 */
export const DocumentModuleConfigSchema = z.object({
  embedding: EmbeddingConfigSchema.optional(),
  storage: z.any().optional(), // StorageProvider type
  middleware: z.array(z.any()).optional() // PipelineMiddleware[] type
});

export type DocumentModuleConfig = z.infer<typeof DocumentModuleConfigSchema>;

/**
 * Validate and process document configuration (Keeping here for now)
 */
export function validateConfig(config: Partial<DocumentModuleConfig> = {}): DocumentModuleConfig {
  return DocumentModuleConfigSchema.parse(config);
}
