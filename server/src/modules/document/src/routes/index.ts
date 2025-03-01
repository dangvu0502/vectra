import { Router } from 'express';
import uploadRouter from './upload';
import searchRouter from './search';
import deleteRouter from './delete';

const router = Router();

router.use(uploadRouter);
router.use(searchRouter);
router.use(deleteRouter);

export default router;