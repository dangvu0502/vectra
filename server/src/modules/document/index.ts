import { DocumentController } from '@/modules/document/document.controller';
import {  DocumentServiceImpl } from '@/modules/document/document.service';

export * from './types';
export * from './document.service';
export * from './document.controller';
export * from './document.routes';
export * from './document.model';

export const documentService = DocumentServiceImpl.getInstance();
export const documentController = DocumentController.getInstance(documentService);