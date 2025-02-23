import type { DocumentStorage } from '../types';
import { uploadDocument } from './upload.service';
import { searchDocuments } from './search.service';
import { deleteDocument } from './delete.service';

export const createDocumentService = (storage: DocumentStorage) => ({
  upload: uploadDocument(storage),
  search: searchDocuments(storage),
  delete: deleteDocument(storage)
});

export type DocumentService = ReturnType<typeof createDocumentService>;