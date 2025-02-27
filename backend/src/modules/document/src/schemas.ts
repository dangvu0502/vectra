import { z } from 'zod';

// Base document schema
export const documentSchema = z.object({
  id: z.string().uuid(),
  filename: z.string().min(1),
  path: z.string().min(1),
  content: z.string(),
  createdAt: z.date()
});





export type Document = z.infer<typeof documentSchema>;