import { Router } from 'express';
import { queryController } from './controller';

const router = Router();

router.get('/', (req, res) => {
    queryController(req, res);
});

export default router;