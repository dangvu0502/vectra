import express from 'express';
import { fileRoutes } from '../modules/file';
import { chatRoutes } from '../modules/chat';
import { authRoutes } from '../modules/auth/auth.routes';

const router = express.Router();

router.use('/v1/files', fileRoutes);
router.use('/v1/chat', chatRoutes);
router.use('/auth', authRoutes);

export const routes = router;
