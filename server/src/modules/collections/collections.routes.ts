import { Router } from 'express';
// Import collections controller
import { collectionsController } from './collections.controller';
// Import middleware from its new location
import { ensureAuthenticated } from '../auth/auth.middleware';
// Remove fileController import

const router = Router();

// Apply authentication middleware to all routes
router.use(ensureAuthenticated);

// --- Collection CRUD Routes ---
// Define routes for collections, applying middleware explicitly
router.post('/', collectionsController.createCollection);
router.get('/', collectionsController.getUserCollections);
router.get('/:collectionId', collectionsController.getCollectionById);
router.put('/:collectionId', collectionsController.updateCollection);
router.delete('/:collectionId', collectionsController.deleteCollection);

// --- File Management within Collection Routes ---
// GET /api/collections/:collectionId/files - List files in a collection
router.get('/:collectionId/files', collectionsController.getCollectionFiles); // Use collectionsController

// POST /api/collections/:collectionId/files - Add a file to a collection
router.post('/:collectionId/files', collectionsController.addFileToCollection); // Use collectionsController

// DELETE /api/collections/:collectionId/files/:fileId - Remove a file from a collection
router.delete('/:collectionId/files/:fileId', collectionsController.removeFileFromCollection); // Use collectionsController

// --- Query Route ---
// POST /api/collections/:collectionId/query - Query embeddings within a collection
router.post('/:collectionId/query', collectionsController.queryCollection);


export const collectionsRouter = router;
