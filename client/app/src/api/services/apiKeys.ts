import { apiClient } from '@/api/core/client';
import type { ApiKey, CreateApiKeyInput, UpdateApiKeyInput } from '@/api/types/apiKey';

const BASE_PATH = '/api/v1/api-keys';

export const apiKeysService = {
  /**
   * Fetches all API keys for the authenticated user.
   */
  async getApiKeys(): Promise<ApiKey[]> {
    return apiClient<ApiKey[]>(BASE_PATH, {
      method: 'GET',
    });
  },

  /**
   * Creates a new API key.
   * @param data - The data for the new API key.
   */
  async createApiKey(data: CreateApiKeyInput): Promise<ApiKey> {
    return apiClient<ApiKey>(BASE_PATH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },

  /**
   * Updates an existing API key.
   * @param apiKeyId - The ID of the API key to update.
   * @param data - The fields to update.
   */
  async updateApiKey(
    apiKeyId: string,
    data: UpdateApiKeyInput
  ): Promise<ApiKey> {
    return apiClient<ApiKey>(`${BASE_PATH}/${apiKeyId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },

  /**
   * Deletes an API key by its ID.
   * @param apiKeyId - The ID of the API key to delete.
   */
  async deleteApiKey(apiKeyId: string): Promise<void> {
    const response = await fetch(`${BASE_PATH}/${apiKeyId}`, {
      method: 'DELETE',
    });

    if (!response.ok && response.status !== 204) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to delete API key' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
  },
}; 