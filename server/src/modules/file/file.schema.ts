import { z } from 'zod';

export const fileSchema = z.object({
  id: z.string().uuid(),
  filename: z.string().min(1),
  path: z.string().min(1),
  content: z.string(),
  user_id: z.string().uuid(),
  metadata: z.object({
    originalSize: z.number(),
    mimeType: z.string(),
    embeddingsCreated: z.boolean().default(false),
    embeddingsTimestamp: z.preprocess((arg) => {
      if (typeof arg === 'string') {
        try {
          return new Date(arg);
        } catch (e) {
          return arg; // Let Zod handle the invalid date string
        }
      }
      return arg; // Pass through if already Date or null/undefined
    }, z.date().optional()),
    embeddingError: z.string().optional()
  }),
  created_at: z.preprocess((arg) => {
    if (typeof arg === 'string') {
      try {
        return new Date(arg);
      } catch (e) {
        return arg;
      }
    }
    return arg;
  }, z.date()),
  updated_at: z.preprocess((arg) => {
    if (typeof arg === 'string') {
      try {
        return new Date(arg);
      } catch (e) {
        return arg;
      }
    }
    return arg;
  }, z.date())
}).strict();

export type File = z.infer<typeof fileSchema>;

export const querySchema = z.object({
  q: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.enum(['filename', 'created_at', 'updated_at']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
}).strict();

export type QueryOptions = z.infer<typeof querySchema>;
