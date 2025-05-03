import type { ApiKeyService } from '../api-keys/api-keys.service';
import type { CollectionService } from '../collections/collections.service';
import type { FileService } from '../file/file.service';
import type { EmbeddingService } from '../file/file.embedding.service';
import { VectraApiController } from './vectra-api.controller';
import { createEnsureApiKeyAuthenticated } from './vectra-api.middleware';
import { createVectraApiRoutes } from './vectra-api.routes';

// Define the structure of the dependencies required by this module
interface VectraApiModuleDependencies {
  apiKeyService: ApiKeyService;
  collectionService: CollectionService;
  fileService: FileService;
  embeddingService: EmbeddingService;
}

// Factory function to create and configure the Vectra API module
export function createVectraApiModule(dependencies: VectraApiModuleDependencies) {
  const {
    apiKeyService,
    collectionService,
    fileService,
    embeddingService,
  } = dependencies;

  // Instantiate the controller with its dependencies
  const controller = new VectraApiController(
    collectionService,
    fileService,
    embeddingService
  );

  // Instantiate the authentication middleware, passing the ApiKeyService
  const authMiddleware = createEnsureApiKeyAuthenticated(apiKeyService);

  // Instantiate the routes, passing the controller and middleware
  const routes = createVectraApiRoutes(controller, authMiddleware);

  // Return the configured routes, ready to be mounted by the main application
  return {
    routes,
    // Optionally export controller or other components if needed elsewhere
    // controller,
  };
}
