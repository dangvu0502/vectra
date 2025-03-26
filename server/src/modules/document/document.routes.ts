import { documentController } from '@/modules/document';
import { DEFAULT_CONFIG } from '@/modules/core/config';
import { Router } from 'express';
import multer from 'multer';

const router = Router();
const upload = multer({
    dest: DEFAULT_CONFIG.uploadDir,
    limits: { fileSize: DEFAULT_CONFIG.maxFileSize },
});

router.post('/upload', upload.single('file'), (req, res) => {
    return documentController.upload(req, res);
});

router.get('/', (req, res) => {
    return documentController.query(req, res);
});

router.get('/:id', (req, res) => {
    return documentController.findById(req, res);
});

router.delete('/:id', (req, res) => {
    return documentController.delete(req, res);
});

export { router as documentRoutes };
