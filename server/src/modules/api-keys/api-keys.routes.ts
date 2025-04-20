import { Router } from 'express';
import { ApiKeyController } from './api-keys.controller';
import { ensureAuthenticated } from '../auth/auth.middleware';
import type { RequestHandler } from 'express';

export function createApiKeyRoutes(controller: ApiKeyController): Router {
  const router = Router();

  router.use(ensureAuthenticated);

  router.post('/', controller.createApiKey.bind(controller) as unknown as RequestHandler);
  router.get('/', controller.listApiKeys.bind(controller) as unknown as RequestHandler);
  router.delete('/:id', controller.deleteApiKey.bind(controller) as unknown as RequestHandler);
  router.patch('/:id/toggle', controller.toggleApiKey.bind(controller) as unknown as RequestHandler);

  return router;
} 