import { Router } from 'express';
// Import only collections controller and middleware
import { collectionsController, ensureAuthenticated } from './collections.controller';
// Remove fileController import

const router = Router();

// --- Collection CRUD Routes ---
// Define routes for collections, applying middleware explicitly
router.post('/', ensureAuthenticated, collectionsController.createCollection);
router.get('/', ensureAuthenticated, collectionsController.getUserCollections);
router.get('/:collectionId', ensureAuthenticated, collectionsController.getCollectionById);
router.put('/:collectionId', ensureAuthenticated, collectionsController.updateCollection);
router.delete('/:collectionId', ensureAuthenticated, collectionsController.deleteCollection);

// --- File Management within Collection Routes ---
// GET /api/collections/:collectionId/files - List files in a collection
router.get('/:collectionId/files', ensureAuthenticated, collectionsController.getCollectionFiles); // Use collectionsController

// POST /api/collections/:collectionId/files - Add a file to a collection
router.post('/:collectionId/files', ensureAuthenticated, collectionsController.addFileToCollection); // Use collectionsController

// DELETE /api/collections/:collectionId/files/:fileId - Remove a file from a collection
router.delete('/:collectionId/files/:fileId', ensureAuthenticated, collectionsController.removeFileFromCollection); // Use collectionsController

// --- Query Route ---
// POST /api/collections/:collectionId/query - Query embeddings within a collection
router.post('/:collectionId/query', ensureAuthenticated, collectionsController.queryCollection);


export const collectionsRouter = router;
