import { Router } from 'express';
import uploadRouter from './upload';
import searchRouter from './search';
import deleteRouter from './delete';
import { PREFIX } from '../config';

const router = Router();

router.use(PREFIX, uploadRouter);
router.use(PREFIX, searchRouter);
router.use(PREFIX, deleteRouter);

export default router;