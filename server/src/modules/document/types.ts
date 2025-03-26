export interface Document {
  id: string;
  filename: string;
  path: string;
  content: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface QueryOptions {
  q?: string;
  page?: string;
  limit?: string;
  sortBy?: keyof Document;
  sortOrder?: 'asc' | 'desc';
}

export interface QueryResult<T = Document> {
  documents: T[];
  total: number;
}

export interface DocumentOperations {
  upload(doc: Omit<Document, 'id' | 'createdAt'>): Promise<Document>;
  findById(id: string): Promise<Document | null>;
  delete(id: string): Promise<boolean>;
  query(options?: QueryOptions): Promise<QueryResult>;
}