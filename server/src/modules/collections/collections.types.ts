import type { Collection, CreateCollectionInput, UpdateCollectionInput, CollectionIdParam, AddFileToCollectionInput, RemoveFileFromCollectionInput } from './collections.validation';

export type { Collection, CreateCollectionInput, UpdateCollectionInput, CollectionIdParam, AddFileToCollectionInput, RemoveFileFromCollectionInput };

export interface CollectionResponse {
  id: string;
  name: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CollectionWithFilesResponse extends CollectionResponse {
  files: Array<{
    id: string;
    filename: string;
    created_at: Date;
  }>;
} 