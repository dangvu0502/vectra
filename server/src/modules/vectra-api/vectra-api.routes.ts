import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import os from 'os';
import type { VectraApiController } from './vectra-api.controller';
import type { RequestHandler } from 'express'; // For casting controller methods

// Configure Multer for file uploads
// Store temporary files in the OS temp directory
const upload = multer({ dest: path.join(os.tmpdir(), 'vectra-uploads') });

// Define the function to create routes, accepting dependencies
export function createVectraApiRoutes(
  controller: VectraApiController,
  authMiddleware: RequestHandler // Pass the instantiated middleware
): Router {
  const router = Router();

  // Apply API key authentication middleware to all routes in this module
  router.use(authMiddleware);

  // --- Collection Routes ---
  router.post('/collections', controller.createCollection.bind(controller) as RequestHandler);
  router.get('/collections', controller.listCollections.bind(controller) as RequestHandler);
  router.get('/collections/:id', controller.getCollection.bind(controller) as RequestHandler);
  router.patch('/collections/:id', controller.updateCollection.bind(controller) as RequestHandler); // Use PATCH for updates
  router.delete('/collections/:id', controller.deleteCollection.bind(controller) as RequestHandler);

  // --- File Routes ---
  // Use multer middleware only for the upload route. 'file' is the field name in the form-data.
  router.post('/files/upload', upload.single('file'), controller.uploadFile.bind(controller) as RequestHandler);
  router.get('/files', controller.listFiles.bind(controller) as RequestHandler);
  router.get('/files/:id', controller.getFile.bind(controller) as RequestHandler);
  router.delete('/files/:id', controller.deleteFile.bind(controller) as RequestHandler);

  // --- Linking Routes ---
  router.post('/collections/:collectionId/files', controller.addFileToCollection.bind(controller) as RequestHandler); // Body contains { fileId }
  router.delete('/collections/:collectionId/files/:fileId', controller.removeFileFromCollection.bind(controller) as RequestHandler);
  router.get('/collections/:id/files', controller.listFilesInCollection.bind(controller) as RequestHandler); // Use :id consistent with getCollection

  // --- Knowledge Query Route ---
  router.post('/query', controller.queryKnowledge.bind(controller) as RequestHandler);

  return router;
}
