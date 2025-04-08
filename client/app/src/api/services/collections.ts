import { apiClient } from '@/api/core/client'; // Remove ApiResponse import
import type { Collection, CreateCollectionInput, UpdateCollectionInput } from '@/api/types/collection'; // Import directly
import type { VectraFile } from '@/api/types/file'; // Import File type directly

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

  /**
   * Fetches files associated with a specific collection.
   * @param collectionId - The ID of the collection.
   */
  async getCollectionFiles(collectionId: string): Promise<{ files: File[]; total: number }> {
    // Backend returns { status: 'success', data: { files, total } }
    // apiClient returns the 'data' part directly on success.
    // Define the expected structure of the successful response data
    type SuccessResponse = {
      status: 'success';
      data: { files: File[]; total: number };
    };
    // Define a broader type for the raw JSON response which might include errors
    type RawResponse = SuccessResponse | { status: 'error'; message: string };

    const response = await apiClient<RawResponse>( // Expect the raw response structure
      `${BASE_PATH}/${collectionId}/files`,
      { method: 'GET' }
    );

    // Type guard to check if the response indicates success
    if (response.status === 'success') {
      return response.data; // Return the nested data object
    } else {
      // Throw an error if the status is not 'success'
      throw new Error(response.message || 'Failed to fetch collection files');
    }
  },

  /**
   * Adds a file to a specific collection.
   * @param collectionId - The ID of the collection.
   * @param fileId - The ID of the file to add.
   */
  async addFileToCollection(collectionId: string, fileId: string): Promise<{ message: string }> {
    // Backend returns { message: '...' } on success
    return apiClient<{ message: string }>(`${BASE_PATH}/${collectionId}/files`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileId }),
    });
  },

  /**
   * Removes a file from a specific collection.
   * @param collectionId - The ID of the collection.
   * @param fileId - The ID of the file to remove.
   */
  async removeFileFromCollection(collectionId: string, fileId: string): Promise<{ message: string }> {
     // Backend returns { message: '...' } on success
    return apiClient<{ message: string }>(`${BASE_PATH}/${collectionId}/files/${fileId}`, {
      method: 'DELETE',
    });
  },
};
