import type { Document, DocumentStorage } from "../types";
import { saveDocument } from './save';
import { findDocument } from './findDocumentById';
import { searchDocuments } from './search';
import { deleteDocument } from './delete';

export const createDocumentStorage = (): DocumentStorage => {
  const documents: Map<string, Document> = new Map();

  return {
    save: saveDocument(documents),
    find: findDocument(documents),
    search: searchDocuments(documents),
    delete: deleteDocument(documents)
  };
};

export type InMemoryDocumentStorage = ReturnType<typeof createDocumentStorage>;