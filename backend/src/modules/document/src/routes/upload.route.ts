import { Router } from 'express';
import multer from 'multer';
import { uploadDocument } from '../controllers';
import type { DocumentService } from '../services';

export function createUploadRouter(service: DocumentService) {
  const router = Router();
  const upload = multer({ dest: 'uploads/' });

  router.post('/', upload.single('file'),
    async (req, res) => { await uploadDocument(service)(req, res) });

  return router;
}