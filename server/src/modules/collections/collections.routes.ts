import { Router } from 'express';
import { CollectionController } from './collections.controller';
import { ensureAuthenticated } from '../auth/auth.middleware';
import type { RequestHandler } from 'express';

export function createCollectionRoutes(controller: CollectionController): Router {
  const router = Router();

  router.use(ensureAuthenticated);

  // Collection CRUD routes
  router.post('/', controller.createCollection.bind(controller) as unknown as RequestHandler);
  router.get('/', controller.getUserCollections.bind(controller) as unknown as RequestHandler);
  router.get('/:collectionId', controller.getCollectionById.bind(controller) as unknown as RequestHandler);
  router.put('/:collectionId', controller.updateCollection.bind(controller) as unknown as RequestHandler);
  router.delete('/:collectionId', controller.deleteCollection.bind(controller) as unknown as RequestHandler);

  // Collection files routes
  router.get('/:collectionId/files', controller.getCollectionFiles.bind(controller) as unknown as RequestHandler);
  router.post('/:collectionId/files', controller.addFileToCollection.bind(controller) as unknown as RequestHandler);
  router.delete('/:collectionId/files/:fileId', controller.removeFileFromCollection.bind(controller) as unknown as RequestHandler);

  // Collection query route
  router.post('/:collectionId/query', controller.queryCollection.bind(controller) as unknown as RequestHandler);

  return router;
} 