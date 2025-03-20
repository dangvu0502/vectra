import { openai } from '@ai-sdk/openai';
import { MDocument } from '@mastra/rag';
import { embedMany, embed } from 'ai';
import type { Document } from './types';

export interface EmbeddingOptions {
  model?: string;
  chunkSize?: number;
  overlapSize?: number;
}

export class DocumentEmbedding {
  private readonly embeddingModel: ReturnType<typeof openai.embedding>;
  private readonly options: Required<EmbeddingOptions>;
  private embeddings: Map<string, number[][]>;

  constructor(options: EmbeddingOptions = {}) {
    this.options = {
      model: options.model || 'text-embedding-3-small',
      chunkSize: options.chunkSize || 1000,
      overlapSize: options.overlapSize || 200
    };
    this.embeddingModel = openai.embedding(this.options.model);
    this.embeddings = new Map();
  }

  async processDocument(document: Document): Promise<void> {
    const doc = MDocument.fromText(document.content, {
      documentId: document.id,
      chunkSize: this.options.chunkSize,
      overlapSize: this.options.overlapSize,
    });

    const chunks = await doc.chunk();
    if (!chunks.length) return;

    const { embeddings } = await embedMany({
      values: chunks.map(chunk => chunk.text),
      model: this.embeddingModel,
    });

    this.embeddings.set(document.id, embeddings);

    if (!document.metadata) {
      document.metadata = {};
    }
    document.metadata.embedding = {
      chunks: chunks.length,
      model: this.options.model,
      timestamp: new Date().toISOString()
    };
  }

  async search(query: string, limit = 5): Promise<Document[]> {
    const { embedding } = await embed({
      value: query,
      model: this.embeddingModel
    });

    const results = Array.from(this.embeddings.entries()).map(([docId, embeddings]) => {
      const maxScore = Math.max(...embeddings.map(e => this.cosineSimilarity(embedding, e)));
      return { docId, score: maxScore };
    });

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ docId }) => ({ id: docId })) as Document[];
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (normA * normB);
  }

  async deleteDocument(id: string): Promise<void> {
    this.embeddings.delete(id);
  }
}