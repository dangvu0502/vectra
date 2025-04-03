import { z } from 'zod';

export const chatMessageSchema = z.object({
  id: z.string().uuid(),
  message: z.string(),
  response: z.string(),
  file_id: z.string().uuid().optional(),
  metadata: z.object({
    model: z.string(),
    tokens: z.number(),
    processingTime: z.number()
  }),
  created_at: z.date(),
  updated_at: z.date()
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
