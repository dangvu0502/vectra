import type { Response } from 'express';

export type ControllerResponse = Promise<Response<ApiResponse>>;
export interface ApiResponse {
  status: 'success' | 'error';
  message?: string;
  data?: any;
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
  search(query: string): Promise<Document[]>;
  delete(id: string): Promise<boolean>;
}