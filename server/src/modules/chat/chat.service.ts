import { embeddingModel, mastra } from "@/modules/mastra";
import { Agent } from "@mastra/core/agent";
import type { PgVector } from "@mastra/pg"; // Import PgVector type
import type { CoreMessage } from "ai";
import { embed } from "ai"; // Import embed function

export interface IChatService {
  chat(userId: string, message: string, docId?: string): Promise<string>;
}

class ChatService implements IChatService {
  private readonly mastraAgent: Agent;
  private readonly vectorStore: PgVector; // Add vector store instance
  private readonly embedder: typeof embeddingModel; // Add embedder instance

  // Constructor now takes injected agent and vector store
  constructor(
    mastraAgent: Agent,
    vectorStore: PgVector,
    embedder: typeof embeddingModel // Add embedder instance
  ) {
    this.mastraAgent = mastraAgent;
    this.vectorStore = vectorStore;
    this.embedder = embedder; // Removed assignment
  }

  async chat(userId: string, message: string, docId: string): Promise<string> {
    try {
      // Use docId as part of the threadId for consistency, or a default if no docId
      const threadId = docId ? `doc-${docId}` : 'global-chat';
      const resourceId = userId; // Use userId as resourceId

      // Prepare messages for the agent
      const messages: CoreMessage[] = [];

      // Embed the user's message to find relevant chunks
      console.log(`Pre-fetching context for docId: ${docId} based on message: "${message}"`);
      const { embedding } = await embed({ model: this.embedder, value: message });

      // Log parameters before querying
      const queryParams = {
        indexName: "text_embeddings", // Make sure this matches your index/table name
        queryVector: embedding, // Use embedded message for similarity search
        topK: 3, // Fetch top 3 relevant chunks
        filter: { 'file_id': docId }, // Use dot notation for nested filter
      };
      // Correctly call query with the parameters object
      const searchResults = await this.vectorStore.query(queryParams);
      const preFetchedContext = searchResults
        // Correctly access the chunk text from metadata.chunk_text
        .map((r, i) => `\n<relevant-snippet>Relevant Snippet ${i + 1}:\n${r.metadata?.chunk_text || 'N/A'}</relevant-snippet> \n`)
        .join("\n\n---\n\n");
      console.log(`Found ${searchResults.length} relevant snippets.`);

      const userMessageContent = `Based on the following relevant snippets from document ${docId}:\n\n${preFetchedContext}\n\nUser query: ${message}\n\nOnly use your document query tools (\`documentQueryTool\`, \`graphRagTool\`, etc.) if these snippets are insufficient.`;
      // Push the potentially modified user message
      messages.push({ role: "user", content: userMessageContent });

      console.log(`Calling Mastra agent for user: ${resourceId}, thread: ${threadId}`);
      // Log the full messages array being sent to the agent
      console.log("Messages sent to agent:", JSON.stringify(messages, null, 2));
      // Removed logging for direct context passing

      // Call the agent's generate method with messages and standard options
      const result = await this.mastraAgent.generate(messages, {
        resourceId,
        threadId,
      });

      // Return the agent's text response
      // Assuming citeSources is not needed as agent handles response generation
      return result.text ?? "Agent did not return a text response.";

    } catch (error) {
      console.error('Chat service error:', error);
      // Provide a more specific error message if possible
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to process chat request: ${errorMessage}`);
    }
  }

}

export const chatService = new ChatService(
  mastra.getAgent("myAgent"),
  mastra.getVector("pgvector"),
  embeddingModel
);