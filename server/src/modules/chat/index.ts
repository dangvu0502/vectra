import { ChatController } from './chat.controller';
import { ChatServiceImpl } from './chat.service';
import { myAgent } from '../mastra/agent'; // Import the configured Mastra agent

// Instantiate the ChatService with the Mastra agent
// Note: ChatServiceImpl doesn't seem to have a getInstance method based on its definition.
// Assuming direct instantiation is intended. If getInstance is needed, the class needs modification.
const chatService = new ChatServiceImpl(myAgent); 

// Instantiate the ChatController with the ChatService
export const chatController = ChatController.getInstance(chatService);

export * from './chat.service';
export * from './chat.routes';
export * from './chat.controller';
