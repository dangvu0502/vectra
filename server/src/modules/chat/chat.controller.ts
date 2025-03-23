import type { Request, Response } from 'express';
// import { DocumentEmbedding } from '../document/embedding'; // Removed unused import
import type { ChatService } from './chat.service';

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
      const { message, docId } = req.body;
      if (!message) {
        res.status(400).json({ error: 'Message is required' });
        return;
      }

      const response = await this.chatService.chat(message, docId);
      res.json({ response });
    } catch (error) {
      console.error('Error in chat controller:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
