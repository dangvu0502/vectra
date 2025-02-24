import { Router } from 'express';
import multer from 'multer';
import { uploadController } from './controller';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.post('/', upload.single('file'), (req, res) => {
    uploadController(req, res);
});

export default router;