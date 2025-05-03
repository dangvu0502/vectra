import { Knex } from 'knex';
import { ApiKeyQueries } from './api-keys.queries';
import { ApiKeyService } from './api-keys.service';
import { ApiKeyController } from './api-keys.controller';
import { createApiKeyRoutes } from './api-keys.routes';
import { redisConnection } from '@/database/redis/connection';

export function createApiKeyModule(db: Knex) {
  const queries = new ApiKeyQueries(db);
  const service = new ApiKeyService(queries, redisConnection);
  const controller = new ApiKeyController(service);
  const routes = createApiKeyRoutes(controller);

  return {
    queries,
    service,
    controller,
    routes,
  };
}
