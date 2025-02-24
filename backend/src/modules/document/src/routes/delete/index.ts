import { Router } from 'express';
import { deleteController } from './controller';
import { withStorage } from '../../middleware/storage';

const router = Router();

router.use(withStorage);
router.delete('/:id', () => {deleteController});

export default router;