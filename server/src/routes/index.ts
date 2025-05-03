import express from "express";
import { authRoutes } from "@/modules/auth/auth.routes";
import arangoDbRoutes from "@/modules/arangodb/arangodb.routes.js";
import { apiKeyModule, collectionsModule, fileModule, vectraApiModule } from "@/modules";
const router = express.Router();

router.use("/auth", authRoutes);
router.use("/v1/files", fileModule.routes);
router.use("/v1/collections", collectionsModule.routes);
router.use("/v1/arangodb", arangoDbRoutes);
router.use("/v1/api-keys", apiKeyModule.routes);
router.use("/v1/vectra", vectraApiModule.routes);

export const routes = router;
