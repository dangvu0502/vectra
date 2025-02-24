import { Router } from 'express';
import { deleteController } from './controller';

const router = Router();
router.delete('/:id', (req, res) => {
    deleteController(req, res)
});

export default router;
