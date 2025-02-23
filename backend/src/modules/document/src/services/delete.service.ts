import fs from 'fs/promises';
import type { DocumentStorage } from '../types';

export const deleteDocument = (storage: DocumentStorage) =>
  async (id: string): Promise<boolean> => {
    const doc = await storage.find(id);
    if (!doc) return false;

    await fs.unlink(doc.path);
    return storage.delete(id);
  };