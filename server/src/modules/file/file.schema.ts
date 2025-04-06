import { z } from 'zod';

// File Schema for validation
export const fileSchema = z.object({
  id: z.string().uuid(),
  filename: z.string().min(1),
  path: z.string().min(1),
  content: z.string(),
  user_id: z.string().uuid(),
  // collection_id: z.string().uuid().nullable(), // Removed - Handled by join table
  metadata: z.object({
    originalSize: z.number(),
    mimeType: z.string(),
    embeddingsCreated: z.boolean().default(false),
    // Preprocess to handle string dates from JSONB
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
  // Preprocess created_at/updated_at if they might come from DB as strings
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

// Query options schema
export const querySchema = z.object({
  q: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.enum(['filename', 'created_at', 'updated_at']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
}).strict();

export type QueryOptions = z.infer<typeof querySchema>;

// Removed Database table name
// export const FILES_TABLE = 'files';
