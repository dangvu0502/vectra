import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { ApiKeyQueries } from './api-keys.queries';
import type { ApiKeyResponse, CreateApiKeyInput, ToggleApiKeyInput } from './api-keys.types';

export class ApiKeyService {
  constructor(private readonly queries: ApiKeyQueries) {}

  async createApiKey(userId: string, input: CreateApiKeyInput): Promise<ApiKeyResponse> {
    const key = `sk-${uuidv4()}-${crypto.randomBytes(16).toString('hex')}`;
    const apiKey = await this.queries.createApiKey(userId, input.name, key);
    
    return {
      id: apiKey.id,
      name: apiKey.name,
      key: apiKey.key,
      is_active: apiKey.is_active,
      last_used_at: apiKey.last_used_at,
      created_at: apiKey.created_at,
    };
  }

  async listApiKeys(userId: string): Promise<ApiKeyResponse[]> {
    const apiKeys = await this.queries.listApiKeys(userId);
    return apiKeys.map(apiKey => ({
      id: apiKey.id,
      name: apiKey.name,
      key: apiKey.key,
      is_active: apiKey.is_active,
      last_used_at: apiKey.last_used_at,
      created_at: apiKey.created_at,
    }));
  }

  async deleteApiKey(userId: string, apiKeyId: string): Promise<void> {
    await this.queries.deleteApiKey(userId, apiKeyId);
  }

  async toggleApiKey(userId: string, apiKeyId: string, input: ToggleApiKeyInput): Promise<void> {
    await this.queries.toggleApiKey(userId, apiKeyId, input.is_active);
  }

  async validateApiKey(key: string): Promise<{ userId: string; apiKeyId: string } | null> {
    return this.queries.validateApiKey(key);
  }
} 