import { v4 as uuidv4 } from 'uuid';
import type { Document, QueryOptions, QueryResult } from './types';
import { DocumentEmbedding } from './embedding';
import { DocumentNotFoundError } from './errors';

export class DocumentService {
    private static instance: DocumentService | null = null;
    private documents: Map<string, Document>;
    private embedding: DocumentEmbedding;

    private constructor() {
        this.documents = new Map();
        this.embedding = new DocumentEmbedding();
    }

    static getInstance(): DocumentService {
        if (!DocumentService.instance) {
            DocumentService.instance = new DocumentService();
        }
        return DocumentService.instance;
    }

    static resetInstance(): void {
        DocumentService.instance = null;
    }

    async upload(file: Express.Multer.File, content: string): Promise<Document> {
        const doc: Document = {
            id: uuidv4(),
            filename: file.originalname,
            path: file.path,
            content,
            createdAt: new Date(),
            metadata: {
                originalSize: content.length,
                mimeType: file.mimetype
            }
        };

        await this.embedding.processDocument(doc);
        this.documents.set(doc.id, doc);
        return doc;
    }

    async query(options: QueryOptions = {}): Promise<QueryResult> {
        const {
            q,
            page = 1,
            limit = 10,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = options;

        let documents = Array.from(this.documents.values());

        if (q) {
            const results = await this.embedding.search(q, documents.length);
            const resultIds = new Set(results.map(r => r.id));
            documents = documents.filter(doc => resultIds.has(doc.id));
        }

        // Sort documents
        documents.sort((a, b) => {
            const valueA = a[sortBy as keyof Document];
            const valueB = b[sortBy as keyof Document];

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

            return 0;
        });

        const startIndex = (page - 1) * limit;
        const paginatedDocs = documents.slice(startIndex, startIndex + limit);

        return {
            documents: paginatedDocs,
            total: documents.length
        };
    }

    async findById(id: string): Promise<Document | null> {
        return this.documents.get(id) || null;
    }

    async delete(id: string): Promise<void> {
        if (!this.documents.has(id)) {
            throw new DocumentNotFoundError(id);
        }
        await this.embedding.deleteDocument(id);
        this.documents.delete(id);
    }
}
