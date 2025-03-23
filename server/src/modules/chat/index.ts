import { ChatController } from './chat.controller';
import { ChatServiceImpl } from './chat.service';
import { DocumentAdapter } from '../adapters/documentAdapter'; // Import the adapters
import { EmbeddingAdapter } from '../adapters/embeddingAdapter';

const documentAdapter = new DocumentAdapter();
const embeddingAdapter = new EmbeddingAdapter(documentAdapter);
const chatService = ChatServiceImpl.getInstance(embeddingAdapter);

export const chatController = ChatController.getInstance(chatService);

export * from './chat.service';
export * from './chat.routes';
export * from './chat.controller';
