import type { InMemoryDocumentStorage } from "./storage";

declare global {
  namespace Express {
    interface Request {
      storage: InstanceType<typeof InMemoryDocumentStorage>;
    }
  }
}

export interface Document {
  id: string;
  filename: string;
  path: string;
  content: string;
  createdAt: Date;
}

export interface DocumentStorage {
  save(doc: Document): Promise<Document>;
  find(id: string): Promise<Document | null>;
  delete(id: string): Promise<boolean>;
  query(
    options?: {
      query?: string; 
      page?: number; 
      limit?: number;
      sortBy?: keyof Document;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{documents: Document[], total: number}>;
}