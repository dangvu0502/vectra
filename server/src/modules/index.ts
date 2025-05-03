import { db } from "@/database/connection";
import { createFileModule } from "./file";
import { createCollectionModule } from "./collections";
import { createApiKeyModule } from "./api-keys";
import { createVectraApiModule } from "./vectra-api"; // Import the new module factory

// Initialize core modules with database connection
const fileModule = createFileModule(db);
const collectionsModule = createCollectionModule(db);
const apiKeyModule = createApiKeyModule(db);

// Initialize the Vectra API module, passing required services as dependencies
const vectraApiModule = createVectraApiModule({
  apiKeyService: apiKeyModule.service,
  collectionService: collectionsModule.service,
  fileService: fileModule.service,
  embeddingService: fileModule.embeddingService,
});

export { fileModule, collectionsModule, apiKeyModule, vectraApiModule }; // Export the new module
