import { Router } from 'express';
import uploadRouter from './upload';
import searchRouter from './search';
import deleteRouter from './delete';
import { withStorage } from '../middleware/storage';

const router = Router();

router.use(withStorage)
router.use('/upload', uploadRouter);
router.use('/search', searchRouter);
router.use('/', deleteRouter);

export default router;