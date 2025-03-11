import type { Document, QueryOptions, QueryResult } from '../core/types';

export interface StorageProvider {
  save(doc: Document): Promise<Document>;
  findById(id: string): Promise<Document | null>;
  delete(id: string): Promise<boolean>;
  query(options?: QueryOptions): Promise<QueryResult>;
}