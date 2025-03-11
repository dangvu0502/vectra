import type { Document, QueryOptions, QueryResult } from '../core/types';

export interface PipelineContext {
  document?: Document;
  query?: QueryOptions;
  result?: QueryResult;
  metadata?: Record<string, unknown>;
}

export interface PipelineMiddleware {
  beforeSave?(context: PipelineContext): Promise<PipelineContext>;
  afterSave?(context: PipelineContext): Promise<void>;
  beforeQuery?(context: PipelineContext): Promise<PipelineContext>;
  afterQuery?(context: PipelineContext): Promise<PipelineContext>;
}