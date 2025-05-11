import type { ApiKeyService } from '../api-keys/api-keys.service';
import type { CollectionService } from '../collections/collections.service';
import type { FileService } from '../file/file.service';
import type { EmbeddingService } from '../file/file.embedding.service';
import { VectraApiController } from './vectra-api.controller';
import { createEnsureApiKeyAuthenticated } from './vectra-api.middleware';
import { createVectraApiRoutes } from './vectra-api.routes';

interface VectraApiModuleDependencies {
  apiKeyService: ApiKeyService;
  collectionService: CollectionService;
  fileService: FileService;
  embeddingService: EmbeddingService;
}

export function createVectraApiModule(dependencies: VectraApiModuleDependencies) {
  const {
    apiKeyService,
    collectionService,
    fileService,
    embeddingService,
  } = dependencies;

  const controller = new VectraApiController(
    collectionService,
    fileService,
    embeddingService
  );

  const authMiddleware = createEnsureApiKeyAuthenticated(apiKeyService);
  const routes = createVectraApiRoutes(controller, authMiddleware);

  return {
    routes,
    // Optionally export controller or other components if needed by other modules.
    // controller,
  };
}
