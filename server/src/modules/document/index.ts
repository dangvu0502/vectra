import { DocumentController } from '@/modules/document/document.controller';
import { DocumentService } from '@/modules/document/document.service';

export * from './types';
export * from './document.service';
export * from './document.controller';
export * from './document.routes';
export * from './errors';
export * from './document.schema';

export const documentService = DocumentService.getInstance();
export const documentController = DocumentController.getInstance(documentService);