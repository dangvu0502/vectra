import type { Document, DocumentStorage } from '../../types';

export async function searchDocuments(storage: DocumentStorage, query: string): Promise<Document[]> {
  return storage.search(query);
}