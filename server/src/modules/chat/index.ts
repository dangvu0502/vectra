import { ChatController } from '@/modules/chat/chat.controller';
import { ChatService } from '@/modules/chat/chat.service';

export const chatService = ChatService.getInstance();
export const chatController = ChatController.getInstance(chatService);

export * from './chat.service';
export * from './chat.routes';
export * from './chat.controller';