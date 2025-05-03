import type {
  CollectionResponse as BaseCollectionResponse,
  CollectionWithFilesResponse as BaseCollectionWithFilesResponse,
} from '@/modules/collections/collections.types';
import type { File as DbFileType } from '@/modules/file/file.schema';
import type { MetadataFilter } from '@/modules/file/file.embedding.queries';

// Re-exporting base types for consistency if needed, or define specific API types
export type CollectionResponse = BaseCollectionResponse;
export type CollectionWithFilesResponse = BaseCollectionWithFilesResponse;

// Define a specific response type for file details via the API
export interface FileResponse extends Omit<DbFileType, 'content' | 'path' | 'user_id'> {
  // Exclude sensitive or internal fields like content, path, user_id
}

// Define a specific response type for listing files via the API
export interface FileListResponseItem extends Omit<FileResponse, 'metadata'> {
  // Potentially simplify metadata for list view
  metadata?: {
    originalSize?: number;
    mimeType?: string;
    embeddingsCreated?: boolean;
    // Add other relevant list metadata if needed
  };
}

// Input type for the knowledge query endpoint
export interface KnowledgeQueryInput {
  queryText: string;
  limit?: number;
  collectionId?: string;
  searchMode?: 'vector' | 'keyword' | 'hybrid';
  includeMetadataFilters?: MetadataFilter[];
  excludeMetadataFilters?: MetadataFilter[];
  maxDistance?: number;
  enableGraphSearch?: boolean;
  graphDepth?: number;
  graphRelationshipTypes?: string[];
  graphTraversalDirection?: 'any' | 'inbound' | 'outbound';
}

// Response type for the knowledge query endpoint
export interface KnowledgeQueryResponseItem {
  vector_id: string;
  file_id: string;
  metadata: Record<string, any>;
  distance?: number;
  rank?: number;
  score?: number;
  synthesized_answer?: string;
}

export type KnowledgeQueryResponse = KnowledgeQueryResponseItem[];

// Input type for adding a file to a collection via API
export interface AddFileToCollectionInput {
  fileId: string;
}

// Input type for creating a collection via API (mirrors validation schema)
export interface CreateCollectionInput {
  name: string;
  description?: string;
}

// Input type for updating a collection via API (mirrors validation schema)
export interface UpdateCollectionInput {
  name?: string;
  description?: string;
}
