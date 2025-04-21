import { z } from 'zod';

export const collectionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().nullable(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const createCollectionSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
});

export const updateCollectionSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
});

export const collectionIdParamSchema = z.object({
  collectionId: z.string().uuid(),
});

export const addFileToCollectionSchema = z.object({
  fileId: z.string().uuid(),
});

export const removeFileFromCollectionSchema = z.object({
  fileId: z.string().uuid(),
});

export type Collection = z.infer<typeof collectionSchema>;
export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;
export type CollectionIdParam = z.infer<typeof collectionIdParamSchema>;
export type AddFileToCollectionInput = z.infer<typeof addFileToCollectionSchema>;
export type RemoveFileFromCollectionInput = z.infer<typeof removeFileFromCollectionSchema>; 