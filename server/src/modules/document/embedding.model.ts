import mongoose, { Schema, Document } from 'mongoose';

interface IEmbedding extends Document {
  documentId: string;
  embedding: number[];
  chunkText: string; // Added chunkText
  metadata?: Record<string, unknown>;
}

const EmbeddingSchema: Schema = new Schema({
  documentId: { type: String, required: true, index: true },
  embedding: { type: [Number], required: true },
  chunkText: { type: String }, // Added chunkText field
  metadata: { type: Schema.Types.Mixed },
});

export default mongoose.model<IEmbedding>('Embedding', EmbeddingSchema);
