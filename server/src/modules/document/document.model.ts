import type { Document as DocumentData, QueryOptions } from '@/modules/document/types'; // Renamed import
import { z, ZodType } from 'zod';
import mongoose, { Schema, Document } from 'mongoose';

// Mongoose Schema
// Extend the 'DocumentData' interface and mongoose.Document
export interface IDocument extends Omit<DocumentData, 'id'>, mongoose.Document {
  _id: mongoose.Types.ObjectId; // Use _id for Mongoose compatibility
  id: string; // Keep string id
}

const DocumentSchema: Schema = new Schema({
    id: { type: String, required: true, unique: true }, // Keep the 'id' field for your application logic
    filename: { type: String, required: true }, // Original filename
    path: { type: String, required: true },
    content: {type: String, required: true },
    createdAt: { type: Date, required: true, default: Date.now },
    metadata: {
        originalSize: { type: Number, required: true },
        mimeType: { type: String, required: true },
        embeddingsCreated: { type: Boolean, default: false },
        embeddingsTimestamp: { type: Date },
        embeddingError: { type: String },
    }
});

DocumentSchema.index({ 'metadata.embeddings': '2dsphere' });

export const DocumentModel = mongoose.model<IDocument>('Document', DocumentSchema);

// Zod Schemas
export const documentSchema = z.object({
    id: z.string().min(1),
    filename: z.string().min(1),
    path: z.string().min(1),
    content: z.string(),
    createdAt: z.date(),
    metadata: z.record(z.string(), z.unknown()).optional()
}).strict() satisfies ZodType<DocumentData>;

export const querySchema = z.object({
    q: z.string().optional(),
    page: z.string()
        .optional(),
    limit: z.string()
        .optional(),
    sortBy: z.enum(Object.keys(documentSchema.shape) as [keyof DocumentData, ...Array<keyof DocumentData>]).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional()
}).strict() satisfies ZodType<QueryOptions>;
