import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import os from 'os';
import type { VectraApiController } from './vectra-api.controller';
import type { RequestHandler } from 'express';

// Configure Multer for file uploads, storing temporary files in the OS temp directory.
const upload = multer({ dest: path.join(os.tmpdir(), 'vectra-uploads') });

export function createVectraApiRoutes(
  controller: VectraApiController,
  authMiddleware: RequestHandler // API key authentication middleware
): Router {
  const router = Router();

  router.use(authMiddleware);

  // Type assertion (as RequestHandler) is used to correctly type bound controller methods for Express.
  // --- Collection Routes ---
  router.post('/collections', controller.createCollection.bind(controller) as RequestHandler);
  router.get('/collections', controller.listCollections.bind(controller) as RequestHandler);
  router.get('/collections/:id', controller.getCollection.bind(controller) as RequestHandler);
  router.patch('/collections/:id', controller.updateCollection.bind(controller) as RequestHandler); // PATCH for partial updates
  router.delete('/collections/:id', controller.deleteCollection.bind(controller) as RequestHandler);

  // --- File Routes ---
  router.post('/files/upload', upload.single('file'), controller.uploadFile.bind(controller) as RequestHandler); // 'file' is the field name
  router.get('/files', controller.listFiles.bind(controller) as RequestHandler);
  router.get('/files/:id', controller.getFile.bind(controller) as RequestHandler);
  router.delete('/files/:id', controller.deleteFile.bind(controller) as RequestHandler);

  // --- Linking Routes ---
  router.post('/collections/:collectionId/files', controller.addFileToCollection.bind(controller) as RequestHandler); // Expects { fileId } in body
  router.delete('/collections/:collectionId/files/:fileId', controller.removeFileFromCollection.bind(controller) as RequestHandler);
  router.get('/collections/:id/files', controller.listFilesInCollection.bind(controller) as RequestHandler); // :id for collectionId consistency

  // --- Knowledge Query Route ---
  router.post('/query', controller.queryKnowledge.bind(controller) as RequestHandler);

  return router;
}
