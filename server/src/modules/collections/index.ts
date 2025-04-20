import { Knex } from 'knex';
import { CollectionQueries } from './collections.queries';
import { CollectionService } from './collections.service';
import { CollectionController } from './collections.controller';
import { createCollectionRoutes } from './collections.routes';

export function createCollectionModule(db: Knex) {
  const queries = new CollectionQueries(db);
  const service = new CollectionService(queries);
  const controller = new CollectionController(service);
  const routes = createCollectionRoutes(controller);

  return {
    queries,
    service,
    controller,
    routes,
  };
} 