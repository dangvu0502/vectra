import { Router } from 'express';
import { chatController } from './index';

const router = Router();

router.post('/', (req, res) => chatController.chat(req, res));

export { router as chatRoutes };
