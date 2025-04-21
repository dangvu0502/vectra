import express from "express";
// Temporarily disable chat routes as per plan
// import { chatRoutes } from '@/modules/chat';
import { authRoutes } from "@/modules/auth/auth.routes";
// import { knowledgeRoutes } from '@/modules/knowledge'; // Removed knowledge routes
import arangoDbRoutes from "@/modules/arangodb/arangodb.routes.js"; // Import ArangoDB routes
import { apiKeyModule, collectionsModule, fileModule } from "@/modules";
const router = express.Router();

// Temporarily disable chat routes as per plan
// router.use('/v1/chat', chatRoutes);
router.use("/auth", authRoutes);
router.use("/v1/files", fileModule.routes);
router.use("/v1/collections", collectionsModule.routes);
router.use("/v1/arangodb", arangoDbRoutes); // Add the ArangoDB routes
// router.use('/v1/knowledge', knowledgeRoutes); // Removed knowledge routes usage
router.use("/v1/api-keys", apiKeyModule.routes);

export const routes = router;
