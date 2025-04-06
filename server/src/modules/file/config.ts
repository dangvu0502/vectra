import { EmbeddingConfigSchema } from '@/shared/config';
import { z } from 'zod';

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
