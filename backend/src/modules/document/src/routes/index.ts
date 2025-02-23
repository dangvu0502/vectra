import { Router } from 'express';
import { createDeleteRouter } from './delete.route';
import { createSearchRouter } from './search.route';
import { createUploadRouter } from './upload.route';
import type { DocumentService } from '../services';

export function createDocumentRouter(service: DocumentService) {
  const router = Router();
  
  router.use('/upload', createUploadRouter(service));
  router.use('/search', createSearchRouter(service));
  router.use('/', createDeleteRouter(service));

  return router;
}