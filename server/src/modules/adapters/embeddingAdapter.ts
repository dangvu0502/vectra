import { EmbeddingServiceImpl } from '../document/embedding';
import type { EmbeddingService } from '../document/embedding';
import type { EmbeddingInputPort } from '../chat/types';
import type { DocumentInputPort } from '../document/embedding';
import type { IDocument } from '../document/document.model';

export class EmbeddingAdapter implements EmbeddingInputPort {
    private embeddingService: EmbeddingServiceImpl;

    constructor(documentInputPort: DocumentInputPort) {
        this.embeddingService = EmbeddingServiceImpl.getInstance({}, documentInputPort);
    }

    async search(query: string, limit?: number, filters?: any): Promise<Array<{ docId: string; score: number; content: string }>> {
        return this.embeddingService.search(query, limit, filters);
    }

    async getDocument(docId: string): Promise<{ content: string } | undefined> {
        const document = await this.embeddingService.documentInputPort.findById(docId);
        if (document) {
            return { content: document.content };
        }
        return undefined;
    }

    async listKnowledgeBases(): Promise<Array<string>> {
        // Since we're using a single knowledge base for now, return an empty array
        return [];
    }
    
  async searchWithinDocuments(docIds: string[], query: string, limit?: number): Promise<Array<{ docId: string; score: number; content: string }>> {
        return this.embeddingService.searchWithinDocuments(docIds, query, limit);
    }

    async getDocuments(docIds: string[]): Promise<Array<{ content: string }>> {
        const documents = await Promise.all(
            docIds.map(id => this.embeddingService.documentInputPort.findById(id))
        );
        return documents
            .filter((doc): doc is IDocument => doc !== null)
            .map(doc => ({ content: doc.content }));
    }
}
