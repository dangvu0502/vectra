import express from 'express';
import { documentRoutes } from '../modules/document';
import { chatRoutes } from '../modules/chat';
import { authRoutes } from '../modules/auth/auth.routes';

const router = express.Router();

router.use('/v1/documents', documentRoutes);
router.use('/v1/chat', chatRoutes);
router.use('/auth', authRoutes);

export const routes = router;
