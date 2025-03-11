import { DocumentManager } from '@/modules/document/core/DocumentManager';
import type { Document, QueryOptions, QueryResult } from '@/modules/document/core/types';

export class DocumentService {
    private static instance: DocumentService;
    private documentManager: DocumentManager;

    private constructor(documentManager: DocumentManager) {
        this.documentManager = documentManager;
    }

    static getInstance(): DocumentService {
        if (!DocumentService.instance) {
            const documentManager = DocumentManager.getInstance();
            DocumentService.instance = new DocumentService(documentManager);
        }
        return DocumentService.instance;
    }

    async upload(file: Express.Multer.File, content: string): Promise<Document> {
        return this.documentManager.upload({
            filename: file.originalname,
            path: file.path,
            content,
            metadata: {
                originalSize: content.length,
                mimeType: file.mimetype
            }
        });
    }

    async query(options: QueryOptions): Promise<QueryResult> {
        return this.documentManager.query(options);
    }

    async findById(id: string): Promise<Document | null> {
        return this.documentManager.findById(id);
    }

    async delete(id: string): Promise<void> {
        await this.documentManager.delete(id);
    }
}
