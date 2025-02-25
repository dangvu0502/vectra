import { Router } from 'express';
import { searchController } from './controller';

const router = Router();
router.get('/search', (req, res) => {
    searchController(req, res);
});

export default router;