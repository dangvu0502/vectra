import { z } from 'zod';

// Base Collection Schema (matches the database structure)
export const CollectionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Name cannot be empty"),
  description: z.string().nullable().optional(),
  user_id: z.string().uuid(),
  created_at: z.date(),
  updated_at: z.date(),
});

// Type inferred from the Zod schema
export type Collection = z.infer<typeof CollectionSchema>;

// Schema for creating a new collection (omits generated fields)
export const CreateCollectionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(), // Optional description
});
export type CreateCollectionInput = z.infer<typeof CreateCollectionSchema>;

// Schema for updating a collection
export const UpdateCollectionSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").optional(),
  description: z.string().nullable().optional(),
});
export type UpdateCollectionInput = z.infer<typeof UpdateCollectionSchema>;

// Schema for collection ID parameter
export const CollectionIdParamSchema = z.object({
  collectionId: z.string().uuid("Invalid Collection ID format"),
});
export type CollectionIdParam = z.infer<typeof CollectionIdParamSchema>;
