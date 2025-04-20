import { Knex } from 'knex';
import type { ApiKey } from './api-keys.types';

export class ApiKeyQueries {
  constructor(private readonly db: Knex) {}

  async createApiKey(userId: string, name: string, key: string): Promise<ApiKey> {
    const [apiKey] = await this.db('api_keys')
      .insert({
        user_id: userId,
        name,
        key,
      })
      .returning('*');

    return apiKey;
  }

  async findApiKeyByName(userId: string, name: string): Promise<ApiKey | null> {
    const [apiKey] = await this.db('api_keys')
      .where({ user_id: userId, name })
      .select('*')
      .limit(1);

    return apiKey || null;
  }

  async listApiKeys(userId: string): Promise<ApiKey[]> {
    return this.db('api_keys')
      .where('user_id', userId)
      .select('*');
  }

  async deleteApiKey(userId: string, apiKeyId: string): Promise<void> {
    await this.db('api_keys')
      .where({ id: apiKeyId, user_id: userId })
      .delete();
  }

  async toggleApiKey(userId: string, apiKeyId: string, isActive: boolean): Promise<void> {
    await this.db('api_keys')
      .where({ id: apiKeyId, user_id: userId })
      .update({ is_active: isActive });
  }

  async validateApiKey(key: string): Promise<{ userId: string; apiKeyId: string } | null> {
    const apiKey = await this.db('api_keys')
      .where({ key, is_active: true })
      .select('user_id', 'id')
      .first();

    if (apiKey) {
      await this.db('api_keys')
        .where('id', apiKey.id)
        .update({ last_used_at: new Date() });
    }

    return apiKey || null;
  }
} 