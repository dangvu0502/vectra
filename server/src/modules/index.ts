import { db } from "@/database/connection";
import { createFileModule } from "./file";
import { createCollectionModule } from "./collections";
import { createApiKeyModule } from "./api-keys";

// Initialize modules with database connection
const fileModule = createFileModule(db);
const collectionsModule = createCollectionModule(db);
const apiKeyModule = createApiKeyModule(db);

export { fileModule, collectionsModule, apiKeyModule };
