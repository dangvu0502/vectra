import express from "express";
import { fileRoutes } from "../modules/file";
// Temporarily disable chat routes as per plan
// import { chatRoutes } from '../modules/chat';
import { authRoutes } from "../modules/auth/auth.routes";
// import { knowledgeRoutes } from '../modules/knowledge'; // Removed knowledge routes

import arangoDbRoutes from "../modules/arangodb/arangodb.routes.js"; // Import ArangoDB routes
import { createApiKeyModule } from "../modules/api-keys";
import { db } from "../database/connection";
import { createCollectionModule } from "../modules/collections/";
const router = express.Router();

// Temporarily disable chat routes as per plan
// router.use('/v1/chat', chatRoutes);
router.use("/auth", authRoutes);
router.use("/v1/files", fileRoutes);

// Initialize collections module with database connection
const collectionsModule = createCollectionModule(db);
router.use("/v1/collections", collectionsModule.routes);

router.use("/v1/arangodb", arangoDbRoutes); // Add the ArangoDB routes
// router.use('/v1/knowledge', knowledgeRoutes); // Removed knowledge routes usage

// Add API key routes
const apiKeyModule = createApiKeyModule(db);
router.use("/v1/api-keys", apiKeyModule.routes);

export const routes = router;
