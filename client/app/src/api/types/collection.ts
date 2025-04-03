// Mirroring the Collection type from the backend (server/src/modules/collections/collections.types.ts)

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  created_at: string; // Dates are typically strings over HTTP
  updated_at: string; // Dates are typically strings over HTTP
}

// Input type for creating a collection
export interface CreateCollectionInput {
  name: string;
  description?: string;
}

// Input type for updating a collection
export interface UpdateCollectionInput {
  name?: string;
  description?: string | null;
}
