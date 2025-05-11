import { Router } from 'express';
import { arangoDbController } from './arangodb.controller'; // Removed .js
// import { requireAuth } from '../auth/auth.middleware'; // Optional: Add auth if needed

const router = Router();

// GET /v1/arangodb/nodes/:key - Fetches a specific ArangoDB node by its _key
// Add requireAuth middleware if endpoint should be protected
router.get('/nodes/:key', /* requireAuth, */ arangoDbController.getNode);

export default router;
