import { apiClient } from '@/api/core/client';
import type { Collection, CreateCollectionInput, UpdateCollectionInput } from '@/api/types';

const BASE_PATH = '/api/v1/collections'; // Using the proxy path

export const collectionsService = {
  /**
   * Fetches all collections for the authenticated user.
   */
  async getCollections(): Promise<Collection[]> {
    return apiClient<Collection[]>(BASE_PATH, {
      method: 'GET',
    });
  },

  /**
   * Fetches a single collection by its ID.
   * @param collectionId - The ID of the collection to fetch.
   */
  async getCollectionById(collectionId: string): Promise<Collection> {
    return apiClient<Collection>(`${BASE_PATH}/${collectionId}`, {
      method: 'GET',
    });
  },

  /**
   * Creates a new collection.
   * @param data - The data for the new collection.
   */
  async createCollection(data: CreateCollectionInput): Promise<Collection> {
    return apiClient<Collection>(BASE_PATH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },

  /**
   * Updates an existing collection.
   * @param collectionId - The ID of the collection to update.
   * @param data - The fields to update.
   */
  async updateCollection(
    collectionId: string,
    data: UpdateCollectionInput
  ): Promise<Collection> {
    return apiClient<Collection>(`${BASE_PATH}/${collectionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },

  /**
   * Deletes a collection by its ID.
   * @param collectionId - The ID of the collection to delete.
   */
  async deleteCollection(collectionId: string): Promise<void> {
    // apiClient expects a JSON response, but DELETE returns 204 No Content.
    // We handle this specific case by checking the status directly.
    const response = await fetch(`${BASE_PATH}/${collectionId}`, {
      method: 'DELETE',
    });

    if (!response.ok && response.status !== 204) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to delete collection' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    // No return value needed for successful deletion (204)
  },
};
