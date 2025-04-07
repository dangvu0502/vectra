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

// --- Schemas moved from Controller ---

// Schema for querying within a collection
export const QueryCollectionBodySchema = z.object({
  queryText: z.string().min(1, "Query text cannot be empty"),
  limit: z.number().int().positive().optional().default(10), // Default limit
});
export type QueryCollectionBodyInput = z.infer<typeof QueryCollectionBodySchema>;

// Schema for adding a file to a collection (params)
export const AddFileToCollectionParamsSchema = z.object({
  collectionId: z.string().uuid("Invalid Collection ID format"),
});
export type AddFileToCollectionParams = z.infer<typeof AddFileToCollectionParamsSchema>;

// Schema for adding a file to a collection (body)
export const AddFileToCollectionBodySchema = z.object({
  fileId: z.string().uuid("Invalid File ID format"),
});
export type AddFileToCollectionBodyInput = z.infer<typeof AddFileToCollectionBodySchema>;

// Schema for removing a file from a collection (params)
export const RemoveFileFromCollectionParamsSchema = z.object({
  collectionId: z.string().uuid("Invalid Collection ID format"),
  fileId: z.string().uuid("Invalid File ID format"),
});
export type RemoveFileFromCollectionParams = z.infer<typeof RemoveFileFromCollectionParamsSchema>;

// Schema for getting files in a collection (params)
export const GetFilesInCollectionParamsSchema = z.object({
  collectionId: z.string().uuid("Invalid Collection ID format"),
});
export type GetFilesInCollectionParams = z.infer<typeof GetFilesInCollectionParamsSchema>;
