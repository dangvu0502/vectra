import type { Document } from "../types";

export const searchDocuments = (documents: Map<string, Document>) =>
  async (query: string): Promise<Document[]> => {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(documents.values())
      .filter(doc => 
        doc.content.toLowerCase().includes(lowercaseQuery) ||
        doc.filename.toLowerCase().includes(lowercaseQuery)
      );
  };