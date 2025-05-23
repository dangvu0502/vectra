import { z } from 'zod';

export const createCollectionSchema = z.object({
  name: z.string().min(1, 'Collection name cannot be empty.').max(255),
  description: z.string().max(1000).optional(),
});

export const updateCollectionSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
}).refine(data => data.name || data.description, {
  message: 'At least one field (name or description) must be provided for update.',
});

export const addFileToCollectionSchema = z.object({
  fileId: z.string().uuid('Invalid File ID format.'),
});

export const knowledgeQuerySchema = z.object({
  queryText: z.string().min(1, 'Query text cannot be empty.'),
  limit: z.number().int().positive().max(50).optional().default(10), // Default limit 10, max 50
  collectionId: z.string().uuid('Invalid Collection ID format.'), // Made non-optional
  searchMode: z.enum(['vector', 'keyword', 'hybrid']).optional().default('hybrid'),
  includeMetadataFilters: z.array(z.object({
    field: z.string(),
    value: z.string(),
  })).optional(),
  excludeMetadataFilters: z.array(z.object({
    field: z.string(),
    value: z.string().optional(), // Allow value or pattern
    pattern: z.string().optional(), // Allow value or pattern
  }).refine(data => data.value || data.pattern, {
    message: 'Either value or pattern must be provided for exclude filter.',
    path: ['excludeMetadataFilters'],
  })).optional(),
  maxDistance: z.number().min(0).max(2).optional(), // Vector distance constraint
  enableGraphSearch: z.boolean().optional().default(false),
  graphDepth: z.number().int().min(1).max(5).optional().default(1), // Limit graph depth
  graphRelationshipTypes: z.array(z.string()).optional(),
  graphTraversalDirection: z.enum(['any', 'inbound', 'outbound']).optional().default('any'),
});

export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid ID format in URL parameter.'),
});

export const collectionFileParamsSchema = z.object({
  collectionId: z.string().uuid('Invalid Collection ID format in URL parameter.'),
  fileId: z.string().uuid('Invalid File ID format in URL parameter.'),
});

export const collectionIdOnlyParamSchema = z.object({
  collectionId: z.string().uuid('Invalid Collection ID format in URL parameter.'),
});

// Types inferred from schemas can be used for request/response typing if not defined separately in .types.ts
export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;
export type AddFileToCollectionInput = z.infer<typeof addFileToCollectionSchema>;
export type KnowledgeQueryInput = z.infer<typeof knowledgeQuerySchema>;
