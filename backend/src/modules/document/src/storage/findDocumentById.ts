import type { Document } from "../types";

export const findDocument = (documents: Map<string, Document>) =>
  async (id: string): Promise<Document | null> => {
    return documents.get(id) || null;
  };