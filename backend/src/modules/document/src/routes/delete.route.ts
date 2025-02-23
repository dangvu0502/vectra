import { Router } from 'express';
import { deleteDocument } from '../controllers';
import type { DocumentService } from '../services';

export function createDeleteRouter(service: DocumentService) {
  const router = Router();

  router.delete('/:id', async (req, res) => { 
    await deleteDocument(service)(req, res) 
  });

  return router;
}