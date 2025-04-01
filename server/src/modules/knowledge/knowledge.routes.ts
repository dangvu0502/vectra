import { Router } from 'express';
import { KnowledgeController } from './knowledge.controller';

const router = Router();

// POST /api/v1/knowledge/query - Query the knowledge base (temporarily without auth)
router.post('/query', KnowledgeController.queryKnowledge);

export const knowledgeRoutes = router;
