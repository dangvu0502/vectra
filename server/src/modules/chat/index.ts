import { mastra } from '@/modules/mastra';
import { ChatController } from './chat.controller';
import { ChatServiceImpl } from './chat.service';

// Instantiate the ChatService with the Mastra agent
// Note: ChatServiceImpl doesn't seem to have a getInstance method based on its definition.
// Assuming direct instantiation is intended. If getInstance is needed, the class needs modification.
const chatService = new ChatServiceImpl(mastra.getAgent("myAgent")); 

// Instantiate the ChatController with the ChatService
export const chatController = ChatController.getInstance(chatService);

export * from './chat.service';
export * from './chat.routes';
export * from './chat.controller';
