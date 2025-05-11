import { Router } from 'express';
import multer from 'multer';
import { FileConfig } from './config';
import { FileController } from './file.controller';
import { ensureAuthenticated } from '@/modules/auth/auth.middleware';

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, FileConfig?.upload?.directory || process.env.UPLOAD_DIR || 'uploads');
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  })
});

export function createFileRoutes(controller: FileController) {
  const router = Router();

  router.use(ensureAuthenticated);

  router.post('/upload', upload.array('files', 10), (req, res, next) => {
    controller.uploadBulk(req, res, next).catch(next);
  });

  router.get('/', (req, res, next) => {
    controller.getFiles(req, res, next).catch(next);
  });

  router.get('/:id', (req, res, next) => {
    controller.getFileById(req, res, next).catch(next);
  });

  router.delete('/:id', (req, res, next) => {
    controller.deleteFile(req, res, next).catch(next);
  });

  router.get('/:id/collections', (req, res, next) => {
    controller.getFileCollections(req, res, next).catch(next);
  });

  return router;
}
