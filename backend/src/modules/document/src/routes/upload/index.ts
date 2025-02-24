import { Router } from 'express';
import multer from 'multer';
import { uploadController } from './controller';
import { withStorage } from '../../middleware/storage';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.use(withStorage);
router.post('/', upload.single('file'),  uploadController);

export default router;