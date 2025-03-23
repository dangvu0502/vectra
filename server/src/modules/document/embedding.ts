import { openai } from '@ai-sdk/openai';
import { MDocument } from '@mastra/rag';
import { embedMany, embed } from 'ai';
import type { Document } from './types';
import Embedding from './embedding.model';
import type { IDocument } from './document.model';

// Input Port (What embeddings needs from documents)
export interface DocumentInputPort {
  findById(id: string): Promise<IDocument | null>;
}

// Define a separate interface for the data stored in MongoDB (without content)
interface DocumentMetadata {
  id: string;
  filename: string;
  path: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface EmbeddingOptions {
  model?: string;
  chunkSize?: number;
  overlapSize?: number;
}

// Output Port - Updated to return chunks
export interface EmbeddingService {
  processDocument(document: Document): Promise<void>;
  search(query: string, limit?: number, filters?: any): Promise<Array<{ docId: string; score: number; content: string }>>;
  searchWithinDocuments(docIds: string[], query: string, limit?: number): Promise<Array<{ docId: string; score: number; content: string }>>;
  deleteDocument(id: string): Promise<void>;
}

export class EmbeddingServiceImpl implements EmbeddingService {
  private static instance: EmbeddingServiceImpl | null = null;
  private readonly embeddingModel: ReturnType<typeof openai.embedding>;
  private readonly options: Required<EmbeddingOptions>;
  readonly documentInputPort: DocumentInputPort; // Made documentInputPort a readonly property

  private constructor(options: EmbeddingOptions = {}, documentInputPort: DocumentInputPort) {
    this.options = {
      model: options.model || 'text-embedding-3-small',
      chunkSize: options.chunkSize || 1000,
      overlapSize: options.overlapSize || 200
    };
    this.embeddingModel = openai.embedding(this.options.model);
    this.documentInputPort = documentInputPort;
  }

  static getInstance(options: EmbeddingOptions = {}, documentInputPort: DocumentInputPort): EmbeddingServiceImpl {
    if (!EmbeddingServiceImpl.instance) {
      EmbeddingServiceImpl.instance = new EmbeddingServiceImpl(options, documentInputPort);
    }
    return EmbeddingServiceImpl.instance;
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

    // Store embeddings in the database along with chunk text
    for (let i = 0; i < chunks.length; i++) {
      await Embedding.create({
        documentId: document.id,
        embedding: embeddings[i],
        chunkText: chunks[i].text, // Store the chunk text
        // metadata: document.metadata, // Removed in a previous step
      });
    }
  }

  async search(query: string, limit = 5, filters?: any): Promise<Array<{ docId: string; score: number; content: string }>> {
    const { embedding } = await embed({
      value: query,
      model: this.embeddingModel
    });

    // Use Atlas Vector Search
    const pipeline: any[] = [];

    if (filters && filters.documentId) {
      pipeline.push({
        $match: { documentId: filters.documentId }
      });
    }

    pipeline.push(
      {
        $search: {
          index: 'vector_index',
          knnBeta: {
            vector: embedding,
            path: 'embedding',
            k: limit, // Number of nearest neighbors to return
          }
        }
      },
      {
        $project: {
          _id: 0,
          docId: '$documentId',
          score: { $meta: "searchScore" },
          content: '$chunkText', // Retrieve the chunk text
        }
      }
    );

    const results = await Embedding.aggregate(pipeline);
    return results as Array<{ docId: string; score: number; content: string }>;
  }

  async searchWithinDocuments(docIds: string[], query: string, limit = 5): Promise<Array<{ docId: string; score: number; content: string }>> {
    const { embedding } = await embed({
      value: query,
      model: this.embeddingModel,
    });

    const pipeline: any[] = [
      {
        $match: {
          documentId: { $in: docIds }, // Filter by the provided document IDs
        },
      },
      {
        $search: {
          index: 'vector_index', // Make sure this index exists and is configured correctly
          knnBeta: {
            vector: embedding,
            path: 'embedding',
            k: limit,
          },
        },
      },
      {
        $project: {
          _id: 0,
          docId: '$documentId',
          score: { $meta: 'searchScore' },
          content: '$chunkText', // Retrieve the chunk text
        },
      },
    ];

    const results = await Embedding.aggregate(pipeline);
    return results as Array<{ docId: string; score: number; content: string }>;
  }

  async deleteDocument(id: string): Promise<void> {
    await Embedding.deleteMany({ documentId: id });
  }
}
