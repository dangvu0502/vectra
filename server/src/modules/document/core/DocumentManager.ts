import { v4 as uuidv4 } from 'uuid';
import type { Document, DocumentOperations, QueryOptions, QueryResult } from './types';
import type { StorageProvider } from '../storage/types';
import type { PipelineContext, PipelineMiddleware } from '../pipeline/types';
import { DocumentNotFoundError } from './errors';
import { InMemoryStorage } from '../storage/memory';

export class DocumentManager implements DocumentOperations {

  private static instance: DocumentManager;
  private storage: StorageProvider;
  private middleware: PipelineMiddleware[];

  private constructor(
    storage: StorageProvider,
    middleware: PipelineMiddleware[] = []
  ) {
    this.storage = storage;
    this.middleware = middleware;
  }

  static getInstance(storage: StorageProvider = new InMemoryStorage(), middleware: PipelineMiddleware[] = []): DocumentManager {
    if (!DocumentManager.instance) {
      DocumentManager.instance = new DocumentManager(storage, middleware);
    }
    return DocumentManager.instance;
  }

  async upload(doc: Omit<Document, 'id' | 'createdAt'>): Promise<Document> {
    let context: PipelineContext = {
      document: {
        ...doc,
        id: uuidv4(),
        createdAt: new Date()
      } as Document
    };

    for (const m of this.middleware) {
      if (m.beforeSave) {
        context = await m.beforeSave(context);
      }
    }

    if (!context.document) {
      throw new Error('Document was removed during middleware execution');
    }

    const savedDoc = await this.storage.save(context.document);

    for (const m of this.middleware) {
      if (m.afterSave) {
        await m.afterSave({ document: savedDoc });
      }
    }

    return savedDoc;
  }

  async findById(id: string): Promise<Document | null> {
    return this.storage.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const doc = await this.findById(id);
    if (!doc) {
      throw new DocumentNotFoundError(id);
    }
    return this.storage.delete(id);
  }

  async query(options?: QueryOptions): Promise<QueryResult> {
    let context: PipelineContext = { query: options };

    for (const m of this.middleware) {
      if (m.beforeQuery) {
        context = await m.beforeQuery(context);
      }
    }

    const result = await this.storage.query(context.query);
    let queryContext: PipelineContext = { result };

    for (const m of this.middleware) {
      if (m.afterQuery) {
        queryContext = await m.afterQuery(queryContext);
      }
    }

    return queryContext.result || result;
  }
}
