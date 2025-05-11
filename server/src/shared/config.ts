import { z } from 'zod';

// Note: API_VERSION, BASE_PATH, FILES_PATH are defined in 'src/config/constants.ts'
// and should be imported from there if needed in this shared context.
// FILES_PATH was previously here with comment: Kept for reference, used in FileConfig

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
