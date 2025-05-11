import { EmbeddingConfigSchema } from '@/shared/config';
import { z } from 'zod';

/**
 * Core file module configuration
 */
// TODO: Review for duplication with src/config/constants.ts (for api paths)
// and src/shared/config.ts (for upload/pagination defaults). Consolidate if possible.
export const FileConfig = {
  api: { // These seem to duplicate global API constants.
    version: 'v1',
    basePath: '/api',
    filesPath: 'files',
    get prefix() {
      return `${this.basePath}/${this.version}/${this.filesPath}`;
    }
  },
  upload: { // These are similar to DEFAULT_CONFIG.upload in shared/config.
    directory: 'uploads',
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },
  pagination: { // These are similar to DEFAULT_CONFIG.pagination in shared/config.
    defaultLimit: 10,
    maxLimit: 100,
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'desc' as const
  }
};

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
 * Validate and process file configuration
 */
export function validateFileConfig(config: Partial<FileModuleConfig> = {}): FileModuleConfig {
  return FileModuleConfigSchema.parse(config);
}
