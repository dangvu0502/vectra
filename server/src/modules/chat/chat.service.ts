import { Agent } from "@mastra/core/agent";
import type { PgVector } from "@mastra/pg"; // Import PgVector type
import type { CoreMessage } from "ai";
import { embed } from "ai"; // Import embed function
import type { AgentTools } from "../mastra/agent";
import { embeddingModel } from "../mastra/config"; // Import vector store and embedding model

export interface ChatService {
  // Add userId parameter
  chat(userId: string, message: string, docId?: string): Promise<string>; 
  // getChatHistory method removed for now, handled by Mastra Memory
}

export class ChatServiceImpl implements ChatService {
  private readonly mastraAgent: Agent<AgentTools>;
  private readonly vectorStore: PgVector; // Add vector store instance
  private readonly embedder = embeddingModel; // Use imported embeddingModel directly, type is inferred

  // Constructor now takes injected agent and vector store
  constructor(
    mastraAgent: Agent<AgentTools>,
    vectorStore: PgVector
    // embedder removed, using imported instance directly
  ) {
    this.mastraAgent = mastraAgent;
    this.vectorStore = vectorStore;
    // this.embedder = embedder; // Removed assignment
  }

  async chat(userId: string, message: string, docId?: string): Promise<string> {
    try {
      // Use docId as part of the threadId for consistency, or a default if no docId
      const threadId = docId ? `doc-${docId}` : 'global-chat'; 
      const resourceId = userId; // Use userId as resourceId

      // Prepare messages for the agent
      const messages: CoreMessage[] = [];

      // --- Simplified Flow: Rely Solely on Agent Tools ---
      let preFetchedContext = "";
      const MAX_CONTEXT_CHARS = 1500; // Limit context size

      if (docId) {
        try {
          // Embed the user's message to find relevant chunks
          console.log(`Pre-fetching context for docId: ${docId} based on message: "${message}"`);
          const { embedding } = await embed({ model: this.embedder, value: message });

          // Log parameters before querying
          const queryParams = {
            indexName: "mastra_vectors", // Make sure this matches your index/table name
            queryVector: embedding, // Use embedded message for similarity search
            topK: 3, // Fetch top 3 relevant chunks
            filter: { 'metadata.doc_id': docId }, // Use dot notation for nested filter
          };
          // Correctly call query with the parameters object
          const searchResults = await this.vectorStore.query(queryParams);
          if (searchResults && searchResults.length > 0) {
            preFetchedContext = searchResults
              // Correctly access the chunk text from metadata.chunk_text
              .map((r, i) => `\n<relevant-snippet>Relevant Snippet ${i + 1}:\n${r.metadata?.chunk_text || 'N/A'}</relevant-snippet> \n`) 
              .join("\n\n---\n\n");
            console.log(`Found ${searchResults.length} relevant snippets.`);
          } else {
            console.log(`No relevant snippets found during pre-fetch for docId: ${docId}.`);
          }
        } catch (searchError) {
          console.error("Error during context pre-fetching:", searchError);
          // Add more details if available
          if (searchError instanceof Error) {
            console.error("Pre-fetch Error Name:", searchError.name);
            console.error("Pre-fetch Error Message:", searchError.message);
            // Log stack trace for more context
            console.error("Pre-fetch Error Stack:", searchError.stack);
          }
          // Proceed without pre-fetched context in case of error
        }

        // Context is now added directly to the user message below
      }
       // --- End Pre-fetch ---

      // Add user message, potentially prepended with context from the pre-fetch step
      let userMessageContent = message;
      if (docId) {
        if (preFetchedContext) {
          // If context snippets were found, prepend them to the user message
          userMessageContent = `Based on the following relevant snippets from document ${docId}:\n\n${preFetchedContext}\n\nUser query: ${message}\n\nOnly use your document query tools (\`documentQueryTool\`, \`graphRagTool\`, etc.) if these snippets are insufficient.`;
        } else {
          // If no snippets were found, inform the user and instruct the agent to use tools
          userMessageContent = `A preliminary search within document ${docId} did not return any specific snippets based on your message. Please use your document query tools (\`documentQueryTool\`, \`graphRagTool\`, etc.) to find the necessary information.\n\nUser query: ${message}`;
        }
      }
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
        // context: preFetchedContext || undefined, // Reverted: context option expects CoreMessage[]
        // Add other options if needed, e.g., temperature
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

  // getChatHistory implementation removed - use Mastra Memory API directly if needed elsewhere
}
