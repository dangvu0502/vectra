import { fileController } from '@/modules/file';
import { DEFAULT_CONFIG } from '@/modules/core/config';
import { Router } from 'express';
import multer from 'multer';

const router = Router();
const upload = multer({
    dest: DEFAULT_CONFIG.uploadDir,
    limits: { fileSize: DEFAULT_CONFIG.maxFileSize },
});

router.post('/upload', upload.single('file'), (req, res) => {
    return fileController.upload(req, res);
});

router.get('/', (req, res) => {
    return fileController.query(req, res);
});

router.get('/:id', (req, res) => {
    return fileController.findById(req, res);
});

router.delete('/:id', (req, res) => {
    return fileController.delete(req, res);
});

export { router as fileRoutes };
