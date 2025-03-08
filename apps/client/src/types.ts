export interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'code' | 'text' | 'image';
  size: string;
  tokens: number;
  language: string;
  createdAt: string;
  status: 'ready' | 'processing' | 'error';
}

export interface VectorStore {
  id: string;
  name: string;
  description: string;
  documentCount: number;
  lastUpdated: string;
  documents: Document[];
}