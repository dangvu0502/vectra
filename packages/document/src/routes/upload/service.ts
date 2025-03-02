import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import type { Document, DocumentStorage } from '../../types';

export async function uploadDocument(storage: DocumentStorage, filename: string, filepath: string): Promise<Document> {
  const content = await fs.readFile(filepath, 'utf-8');
  const doc: Document = {
    id: uuidv4(),
    filename,
    path: filepath,
    content,
    createdAt: new Date()
  };
  return storage.save(doc);
}