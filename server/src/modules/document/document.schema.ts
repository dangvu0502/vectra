import type { Document, QueryOptions } from '@/modules/document/core/types';
import { z, ZodType } from 'zod';

export const documentSchema = z.object({
    id: z.string().min(1),
    filename: z.string().min(1),
    path: z.string().min(1),
    content: z.string(),
    createdAt: z.date(),
    metadata: z.record(z.string(), z.unknown()).optional()
}).strict() satisfies ZodType<Document>;

export const querySchema = z.object({
    q: z.string().optional(),
    page: z.number().optional(),
    limit: z.number().optional(),
    sortBy: z.enum(Object.keys(documentSchema.shape) as [keyof Document, ...Array<keyof Document>]).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional()
}).strict() satisfies ZodType<QueryOptions>;
