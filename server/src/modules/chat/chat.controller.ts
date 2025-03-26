import type { Request, Response } from 'express'; // Use type-only import
import type { ChatService } from './chat.service'; // Use type-only import
import { z } from 'zod';

// Define a placeholder user ID retrieval function
// In a real app, this would come from req.user, req.session, headers, etc.
const getUserIdFromRequest = (req: Request): string => {
  // Replace with your actual user identification logic
  return "user_placeholder_123"; 
};

const chatRequestSchema = z.object({
  message: z.string().min(1),
  docId: z.string().uuid().optional(),
  // threadId: z.string().optional() // Could add threadId if needed directly from client
});

export class ChatController {
  private static instance: ChatController | null;
  private chatService: ChatService;

  private constructor(chatService: ChatService) {
    this.chatService = chatService;
  }

  static getInstance(chatService: ChatService): ChatController {
    if (!ChatController.instance) {
      ChatController.instance = new ChatController(chatService);
    }
    return ChatController.instance;
  }

    static resetInstance(): void {
        ChatController.instance = null;
    }

  async chat(req: Request, res: Response): Promise<void> {
    try {
      const { message, docId } = chatRequestSchema.parse(req.body);
      const userId = getUserIdFromRequest(req); // Get user ID from request context

      // Call the service with userId, message, and docId
      const responseText = await this.chatService.chat(userId, message, docId); 
      
      res.json({ response: responseText }); // Send back the agent's text response
    } catch (error) {
      console.error('Chat controller error:', error);
      // Improve error reporting
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: `Failed to process chat request: ${errorMessage}` });
    }
  }

  // getHistory endpoint removed - history managed by Mastra Memory
}
