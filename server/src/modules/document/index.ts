export type { Document, QueryOptions, QueryResult, DocumentOperations } from './core/types';
export type { PipelineContext, PipelineMiddleware } from './pipeline/types';
export type { StorageProvider } from './storage/types';
export { DocumentManager } from './core/DocumentManager';
export { InMemoryStorage } from './storage/memory';
export { DocumentError, DocumentNotFoundError, InvalidDocumentError } from './core/errors';
export * from './config'
export { documentRoutes } from './document.routes';
