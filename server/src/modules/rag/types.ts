import type { Document } from '../document';

export interface EmbeddingConfig {
  model: string;
  dimensions: number;
  chunkSize?: number;
  overlapSize?: number;
}

export interface DocumentChunk {
  text: string;
  metadata: Record<string, any>;
  embedding: number[];
  score?: number;
}

export interface EmbeddingResult {
  chunks: DocumentChunk[];
  metadata: Record<string, any>;
}

export interface SearchOptions {
  limit?: number;
  threshold?: number;
}

export interface VectorDBConfig {
  connectionString: string;
  indexName: string;
}