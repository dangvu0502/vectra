import { Router } from 'express';
import { searchController } from './controller';

const router = Router();
router.get('/', (req, res) => {
    searchController(req, res);
});

export default router;