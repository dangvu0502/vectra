import { Router } from 'express';
import multer from 'multer';
import { deleteDocument, searchDocuments, uploadDocument } from '../controllers';
import type { DocumentService } from '../services';

export function createDocumentRouter(service: DocumentService) {
  const router = Router();
  const upload = multer({ dest: 'uploads/' });

  router.post('/upload', upload.single('file'),
    async (req, res) => { await uploadDocument(service)(req, res) });

  router.get('/search',
    async (req, res) => { await searchDocuments(service)(req, res) });

  router.delete('/:id',
    async (req, res) => { await deleteDocument(service)(req, res) });

  return router;
}