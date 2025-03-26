import { DocumentController } from './document.controller'; // Use relative paths
import { DocumentServiceImpl } from './document.service';
import { EmbeddingServiceImpl } from './embedding';
import { db } from '../../database/connection'; // Assuming DB connection is exported from here
import { embeddingModel, pgVector } from '../mastra/config'; // Import centralized Mastra components

// Remove ambiguous re-export from types.ts
// export * from './types'; 
export * from './document.service';
export * from './document.controller';
export * from './document.routes';
export * from './document.model';

// Instantiate EmbeddingService with centralized components
export const embeddingService = EmbeddingServiceImpl.getInstance(embeddingModel, pgVector);

// Instantiate DocumentService with DB connection and EmbeddingService
export const documentService = new DocumentServiceImpl(db, embeddingService); // Assuming direct instantiation

// Instantiate DocumentController
export const documentController = DocumentController.getInstance(documentService);
