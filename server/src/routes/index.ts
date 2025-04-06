import express from 'express';
import { fileRoutes } from '../modules/file';
// Temporarily disable chat routes as per plan
// import { chatRoutes } from '../modules/chat';
import { authRoutes } from '../modules/auth/auth.routes';
// import { knowledgeRoutes } from '../modules/knowledge'; // Removed knowledge routes
import { collectionsRouter } from '../modules/collections'; // Import the new router

const router = express.Router();

// Temporarily disable chat routes as per plan
// router.use('/v1/chat', chatRoutes);
router.use('/auth', authRoutes);
router.use('/v1/files', fileRoutes);
router.use('/v1/collections', collectionsRouter); // Add the collections routes
// router.use('/v1/knowledge', knowledgeRoutes); // Removed knowledge routes usage

export const routes = router;
