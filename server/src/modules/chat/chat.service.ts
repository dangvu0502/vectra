import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import * as tools from "./tools";
import { citeSources } from "./tools";
import type { ToolAction, VercelTool } from "@mastra/core/tools";
import type { EmbeddingInputPort } from "./types";

interface SearchResult {
  docId: string;
  score: number;
  content: string;
}

export interface ChatService {
  chat(message: string, docId?: string): Promise<string>;
}

export class ChatServiceImpl implements ChatService {
  private static instance: ChatServiceImpl | null = null;
  private readonly embeddingInputPort: EmbeddingInputPort;
  private retrievedDocuments: SearchResult[] = [];

  private constructor(embeddingInputPort: EmbeddingInputPort) {
    this.embeddingInputPort = embeddingInputPort;
  }

    static getInstance(embeddingInputPort: EmbeddingInputPort): ChatServiceImpl {
        if (!ChatServiceImpl.instance) {
            ChatServiceImpl.instance = new ChatServiceImpl(embeddingInputPort);
        }
        return ChatServiceImpl.instance;
    }

    static resetInstance(): void {
        ChatServiceImpl.instance = null;
    }

  private wrapToolWithLog<T extends ToolAction<any, any, any, unknown>>(
    tool: T,
    options: { docId?: string; query?: string } = {}
  ): T {
    const wrappedTool = {
      id: tool.id,
      description: tool.description,
      inputSchema: tool.inputSchema,
      outputSchema: tool.outputSchema,
      execute: async (params: { context?: any }, execOptions?: unknown) => {
        try {
          const { docId, query } = options;
          const updatedParams = {
            ...params,
            context: {
              ...params.context,
              docId: docId || params.context?.docId,
              query: query || params.context?.query,
              relevantDocuments: this.retrievedDocuments,
            },
          };

          if (typeof tool.execute !== 'function') {
            throw new Error(`Tool ${tool.id} does not have an execute function`);
          }

          const results = await tool.execute(updatedParams, execOptions);

          if (tool.id === 'SearchKnowledgeBase' && Array.isArray(results)) {
            this.retrievedDocuments = [...this.retrievedDocuments, ...results];
          }

          return results;
        } catch (error) {
          console.error(`Tool execution failed:`, { toolId: tool.id, error });
          throw error;
        }
      }
    };

    return wrappedTool as T;
  }

  async chat(message: string, docId?: string): Promise<string> {
    try {
      this.retrievedDocuments = [];
      const instructions = `You are a helpful research assistant that analyzes documents.
Focus on these key points:
1. Use searchKnowledgeBase to find relevant information.
2. Provide accurate, well-supported answers.
3. Acknowledge when information is insufficient.
4. Base responses only on provided content.
5. Always cite sources using [doc-{id}] format.
6. Focus on document ID: ${docId}`;

      const chatAgent = new Agent({
        name: "chat-agent",
        instructions,
        model: openai.chat("gpt-4o"),
        tools: {
          searchKnowledgeBase: this.wrapToolWithLog(tools.searchKnowledgeBase(this.embeddingInputPort), {docId, query: message}),
          refineSearch: this.wrapToolWithLog(tools.refineSearch(this.embeddingInputPort), {docId, query: message}),
          getDocumentDetails: this.wrapToolWithLog(tools.getDocumentDetails(this.embeddingInputPort), {docId, query: message}),
          ...(docId ? {} : {
            listKnowledgeBases: this.wrapToolWithLog(tools.listKnowledgeBases(this.embeddingInputPort), {docId, query: message}),
            summarizeDocuments: this.wrapToolWithLog(tools.summarizeDocuments(this.embeddingInputPort), {docId, query: message}),
          }),
        }
      });

      const result = await chatAgent.generate([{ role: "user", content: message }]);
      return citeSources(result.text, this.retrievedDocuments);
    } catch (error) {
      console.error('Chat error:', error);
      throw new Error('Failed to process chat request');
    }
  }
}
