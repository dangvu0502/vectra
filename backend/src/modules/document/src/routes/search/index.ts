import { Router } from 'express';
import { searchController } from './controller';
import { withStorage } from '../../middleware/storage';

const router = Router();

router.use(withStorage);
router.get('/', () => {searchController});

export default router;