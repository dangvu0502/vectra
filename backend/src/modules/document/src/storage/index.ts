import type { Document, DocumentStorage } from "../types";

export class InMemoryDocumentStorage implements DocumentStorage {
  private documents: Map<string, Document>;

  constructor() {
    this.documents = new Map();
  }

  async save(doc: Document): Promise<Document> {
    this.documents.set(doc.id, doc);
    return doc;
  }

  async find(id: string): Promise<Document | null> {
    return this.documents.get(id) || null;
  }

  async search(query: string): Promise<Document[]> {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.documents.values())
      .filter(doc => 
        doc.content.toLowerCase().includes(lowercaseQuery) ||
        doc.filename.toLowerCase().includes(lowercaseQuery)
      );
  }

  async delete(id: string): Promise<boolean> {
    return this.documents.delete(id);
  }
}