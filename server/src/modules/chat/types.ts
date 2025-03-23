export interface EmbeddingInputPort {
  search(query: string, limit?: number, filters?: any): Promise<Array<{ docId: string; score: number; content: string }>>;
  searchWithinDocuments(docIds: string[], query: string, limit?: number): Promise<Array<{ docId: string; score: number; content: string }>>;
  listKnowledgeBases?(): Promise<Array<string>>;
  getDocument?(docId: string): Promise<{ content: string } | undefined>;
  getDocuments?(docIds: string[]): Promise<Array<{ content: string }>>;
}
