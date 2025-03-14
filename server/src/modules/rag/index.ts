import { openai } from '@ai-sdk/openai';
import { MDocument } from '@mastra/rag';
import { embedMany, embed } from 'ai';
import type { EmbeddingConfig, DocumentChunk, EmbeddingResult, SearchOptions } from './types';
import type { Document } from '../document';

export class EmbeddingService {
  private readonly embeddingModel: ReturnType<typeof openai.embedding>;
  private readonly config: EmbeddingConfig;
  private documents: Map<string, DocumentChunk[]>;


  constructor(embeddingConfig: EmbeddingConfig) {
  console.log(process.env.OPENAI_API_KEY)

    this.config = embeddingConfig;
    this.embeddingModel = openai.embedding(this.config.model);
    this.documents = new Map();
  }

  async embedDocument(
    document: Document,
    metadata: Record<string, any> = {}
  ): Promise<EmbeddingResult> {
    try {
      const doc = MDocument.fromText(document.content, {
        ...metadata,
        documentId: document.id,
        chunkSize: this.config.chunkSize,
        overlapSize: this.config.overlapSize,
      });

      const chunks = await doc.chunk();
      if (!chunks.length) {
        throw new Error('Document chunking resulted in no chunks');
      }

      const { embeddings } = await embedMany({
        values: chunks.map(chunk => chunk.text),
        model: this.embeddingModel,
      });

      const enrichedChunks = chunks.map((chunk, index) => ({
        text: chunk.text,
        metadata: {
          ...chunk.metadata,
          documentId: document.id,
          chunkIndex: index
        },
        embedding: embeddings[index]
      }));

      // Store chunks in memory
      this.documents.set(document.id, enrichedChunks);

      return {
        chunks: enrichedChunks,
        metadata: {
          documentId: document.id,
          totalChunks: chunks.length,
          embeddingModel: this.config.model,
          dimensions: this.config.dimensions,
          processedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      throw new Error(`Document embedding failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async searchSimilar(
    query: string,
    options: SearchOptions = {}
  ): Promise<DocumentChunk[]> {
    try {
      const { limit = 5, threshold = 0.7 } = options;
      const {embedding} = await embed({
        value: query,
        model: this.embeddingModel
      });

      const allChunks = Array.from(this.documents.values()).flat();
      const results = await Promise.all(
        allChunks.map(async chunk => {
          const score = await this.calculateSimilarity(embedding, chunk.embedding);
          return { ...chunk, score };
        })
      );

      return results
        .filter(result => result.score >= threshold)
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, limit);
    } catch (error) {
      throw new Error(`Similarity search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async calculateSimilarity(embedding1: number[], embedding2: number[]): Promise<number> {
    // Cosine similarity implementation
    const dotProduct = embedding1.reduce((sum, val, i) => sum + val * embedding2[i], 0);
    const norm1 = Math.sqrt(embedding1.reduce((sum, val) => sum + val * val, 0));
    const norm2 = Math.sqrt(embedding2.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (norm1 * norm2);
  }
}
