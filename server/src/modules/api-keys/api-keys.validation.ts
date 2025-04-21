import { z } from 'zod';

export const apiKeySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  key: z.string().min(32).max(255),
  is_active: z.boolean(),
  last_used_at: z.date().nullable(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(255),
});

export const toggleApiKeySchema = z.object({
  is_active: z.boolean(),
});

export type ApiKey = z.infer<typeof apiKeySchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type ToggleApiKeyInput = z.infer<typeof toggleApiKeySchema>; 