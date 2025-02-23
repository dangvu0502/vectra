import type { Document } from "../types";

export const saveDocument = (documents: Map<string, Document>) =>
  async (doc: Document): Promise<Document> => {
    documents.set(doc.id, doc);
    return doc;
  };