import { Knex } from 'knex';
import { FileQueries } from './file.queries';
import { FileService } from './file.service';
import { FileController } from './file.controller';
import { createFileRoutes } from './file.routes';
import { EmbeddingService } from './file.embedding.service';
import { CollectionQueries } from '@/modules/collections/collections.queries';

export function createFileModule(db: Knex) {
  const queries = new FileQueries(db);
  const embeddingService = EmbeddingService.getInstance(db);
  const collectionQueries = new CollectionQueries(db);
  const service = new FileService(queries, embeddingService, collectionQueries);
  const controller = new FileController(service);
  const routes = createFileRoutes(controller);

  return {
    queries,
    service,
    controller,
    routes,
  };
}
