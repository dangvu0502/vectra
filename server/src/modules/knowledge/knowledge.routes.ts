import { Router } from 'express';
import { KnowledgeController } from './knowledge.controller';
import { passport } from '@/modules/auth/passport.config';

const router = Router();

// Apply authentication middleware to all knowledge routes
router.use(passport.authenticate('session'));

// POST /api/v1/knowledge/query - Query the knowledge base
router.post('/query', KnowledgeController.queryKnowledge);

export const knowledgeRoutes = router;
