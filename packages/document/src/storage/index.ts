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

  async delete(id: string): Promise<boolean> {
    return this.documents.delete(id);
  }

  async query(options: {
    query?: string;
    page?: number;
    limit?: number;
    sortBy?: keyof Document;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{ documents: Document[]; total: number }> {
    const {
      query,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    // Get all documents or filtered by search query
    let filteredDocuments = Array.from(this.documents.values());

    if (query) {
      const lowercaseQuery = query.toLowerCase();
      filteredDocuments = filteredDocuments.filter(doc => 
        doc.content.toLowerCase().includes(lowercaseQuery) ||
        doc.filename.toLowerCase().includes(lowercaseQuery)
      );
    }

    const total = filteredDocuments.length;

    // Sort documents with null handling
    const sortedDocuments = filteredDocuments.sort((a, b) => {
      const valueA = a[sortBy];
      const valueB = b[sortBy];

      // Handle null/undefined values
      if (valueA == null && valueB == null) return 0;
      if (valueA == null) return sortOrder === 'asc' ? -1 : 1;
      if (valueB == null) return sortOrder === 'asc' ? 1 : -1;

      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return sortOrder === 'asc'
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }

      if (valueA instanceof Date && valueB instanceof Date) {
        return sortOrder === 'asc'
          ? valueA.getTime() - valueB.getTime()
          : valueB.getTime() - valueA.getTime();
      }

      return sortOrder === 'asc'
        ? (valueA as any) - (valueB as any)
        : (valueB as any) - (valueA as any);
    });

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginatedDocuments = sortedDocuments.slice(startIndex, startIndex + limit);

    return {
      documents: paginatedDocuments,
      total
    };
  }
}