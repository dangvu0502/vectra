import { Agent } from "@mastra/core/agent"; // Import correct Agent type
import type { AgentTools } from "../mastra/agent"; // Use type-only import for AgentTools
import type { CoreMessage } from "ai"; // Use type-only import for CoreMessage

// Define a placeholder user ID generation/retrieval function
// In a real app, this would come from authentication/session
const getUserId = (): string => "user_placeholder_123"; 

export interface ChatService {
  // Add userId parameter
  chat(userId: string, message: string, docId?: string): Promise<string>; 
  // getChatHistory method removed for now, handled by Mastra Memory
}

export class ChatServiceImpl implements ChatService {
  // Inject the specific Mastra Agent 
 private readonly mastraAgent: Agent<AgentTools>;
  // Constructor now takes the injected agent instance
  constructor(mastraAgent: Agent<AgentTools>) {
    this.mastraAgent = mastraAgent;
  }

  async chat(userId: string, message: string, docId?: string): Promise<string> {
    try {
      // Use docId as part of the threadId for consistency, or a default if no docId
      const threadId = docId ? `doc-${docId}` : 'global-chat'; 
      const resourceId = userId; // Use userId as resourceId

      // Prepare messages for the agent
      const messages: CoreMessage[] = [{ role: "user", content: message }];
      
      // Add context about the specific document if docId is present
      // The agent instructions already guide it to use filters based on context,
      // but explicitly mentioning it in the prompt can help reinforce focus.
      if (docId) {
        messages.unshift({ 
          role: "system", 
          content: `Context: We are discussing the document with ID: ${docId}. Focus your knowledge base queries using this ID.` 
        });
      }

      console.log(`Calling Mastra agent for user: ${resourceId}, thread: ${threadId}`);
      
      // Call the agent's generate method with messages and options
      const result = await this.mastraAgent.generate(messages, {
        resourceId,
        threadId,
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
