import { Router } from 'express';
import { searchDocuments } from '../controllers';
import type { DocumentService } from '../services';

export function createSearchRouter(service: DocumentService) {
  const router = Router();

  router.get('/', async (req, res) => { 
    await searchDocuments(service)(req, res) 
  });

  return router;
}