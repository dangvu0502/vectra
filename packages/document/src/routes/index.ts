import { Router } from 'express';
import uploadRouter from './upload';
import queryRouter from './query';
import deleteRouter from './delete';

const router = Router();

router.use(uploadRouter);
router.use(queryRouter); 
router.use(deleteRouter);

export default router;