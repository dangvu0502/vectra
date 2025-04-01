import express from 'express';
import { fileRoutes } from '../modules/file';
// Temporarily disable chat routes as per plan
// import { chatRoutes } from '../modules/chat';
import { authRoutes } from '../modules/auth/auth.routes';
import { knowledgeRoutes } from '../modules/knowledge';

const router = express.Router();

router.use('/v1/files', fileRoutes);
// Temporarily disable chat routes as per plan
// router.use('/v1/chat', chatRoutes);
router.use('/auth', authRoutes);
router.use('/v1/knowledge', knowledgeRoutes);

export const routes = router;
