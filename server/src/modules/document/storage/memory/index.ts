import type { Document, QueryOptions, QueryResult } from '../../core/types';
import type { StorageProvider } from '../types';
import { DEFAULT_CONFIG } from '../../config';
import { DocumentNotFoundError } from '../../core/errors';

export class InMemoryStorage implements StorageProvider {
    private documents: Map<string, Document>;

    constructor() {
        this.documents = new Map();
    }

    async save(doc: Document): Promise<Document> {
        this.documents.set(doc.id, doc);
        return doc;
    }

    async findById(id: string): Promise<Document | null> {
        return this.documents.get(id) || null;
    }

    async delete(id: string): Promise<boolean> {
        const exists = await this.findById(id);
        if (!exists) {
            throw new DocumentNotFoundError(id);
        }
        return this.documents.delete(id);
    }

    async query(options: QueryOptions = {}): Promise<QueryResult> {
        const {
            q,
            page = 1,
            limit = DEFAULT_CONFIG.pagination.defaultLimit,
            sortBy = DEFAULT_CONFIG.pagination.defaultSortBy,
            sortOrder = DEFAULT_CONFIG.pagination.defaultSortOrder
        } = options;

        // Validate pagination parameters
        if (page < 1) throw new Error('Page must be greater than 0');
        if (limit < 1) throw new Error('Limit must be greater than 0');
        
        // Get all documents or filtered by search query
        let filteredDocuments = Array.from(this.documents.values());

        if (q) {
            const lowercaseQuery = q.toLowerCase();
            filteredDocuments = filteredDocuments.filter(doc =>
                doc.content.toLowerCase().includes(lowercaseQuery) ||
                doc.filename.toLowerCase().includes(lowercaseQuery)
            );
        }

        const total = filteredDocuments.length;

        // Sort documents
        const sortedDocuments = filteredDocuments.sort((a, b) => {
            // Type-safe property access
            const valueA = sortBy ? a[sortBy as keyof Document] : null;
            const valueB = sortBy ? b[sortBy as keyof Document] : null;

            // Handle null/undefined values
            if (valueA == null && valueB == null) return 0;
            if (valueA == null) return sortOrder === 'asc' ? -1 : 1;
            if (valueB == null) return sortOrder === 'asc' ? 1 : -1;

            // Type-specific comparisons
            if (valueA instanceof Date && valueB instanceof Date) {
                return sortOrder === 'asc'
                    ? valueA.getTime() - valueB.getTime()
                    : valueB.getTime() - valueA.getTime();
            }

            if (typeof valueA === 'string' && typeof valueB === 'string') {
                return sortOrder === 'asc'
                    ? valueA.localeCompare(valueB)
                    : valueB.localeCompare(valueA);
            }

            // Default numeric comparison
            const numA = Number(valueA);
            const numB = Number(valueB);
            return sortOrder === 'asc' ? numA - numB : numB - numA;
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