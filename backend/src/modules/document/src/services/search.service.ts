import type { Document, DocumentStorage } from '../types';

export const searchDocuments = (storage: DocumentStorage) =>
  async (query: string): Promise<Document[]> => {
    return storage.search(query);
  };