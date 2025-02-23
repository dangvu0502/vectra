import type { Document } from "../types";

export const deleteDocument = (documents: Map<string, Document>) =>
  async (id: string): Promise<boolean> => {
    return documents.delete(id);
  };