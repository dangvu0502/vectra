import { Agent } from "@mastra/core/agent"; // Import correct Agent type
// Import the original AgentTools type from the agent definition
import type { AgentTools } from "../mastra/agent"; 
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
  // Inject the specific Mastra Agent using the original AgentTools type
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
      const messages: CoreMessage[] = []; // Initialize empty

      // Add system message for context if docId is present
      if (docId) {
        messages.push({
          role: "system",
          content: `Context: We are discussing the document with ID: ${docId}. Focus your knowledge base queries using this ID.`
        });
      }
      // Add user message
      messages.push({ role: "user", content: message });


      console.log(`Calling Mastra agent for user: ${resourceId}, thread: ${threadId}`);
      
      // Call the agent's generate method with messages and standard options
      // The docId context is provided via the system message added earlier
      const result = await this.mastraAgent.generate(messages, {
        resourceId,
        threadId,
        context:[{
          "role": "user",
          "content": `this is the docId we are talking about ${docId}`
        }]
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
