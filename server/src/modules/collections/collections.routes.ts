import { Router } from 'express';
// Import both controller and the middleware
import { collectionsController, ensureAuthenticated } from './collections.controller'; 

const router = Router();

// Define routes for collections, applying middleware explicitly
router.post('/', ensureAuthenticated, collectionsController.createCollection);
router.get('/', ensureAuthenticated, collectionsController.getUserCollections);
router.get('/:collectionId', ensureAuthenticated, collectionsController.getCollectionById);
router.put('/:collectionId', ensureAuthenticated, collectionsController.updateCollection);
router.delete('/:collectionId', ensureAuthenticated, collectionsController.deleteCollection);

export const collectionsRouter = router;
