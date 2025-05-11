import { Knex } from 'knex';
import type { ApiKey } from './api-keys.types';
import { PG_TABLE_NAMES } from '../../database/constants';

export class ApiKeyQueries {
  constructor(private readonly db: Knex) {}

  async createApiKey(userId: string, name: string, key: string): Promise<ApiKey> {
    const [apiKey] = await this.db(PG_TABLE_NAMES.API_KEYS)
      .insert({
        user_id: userId,
        name,
        key,
      })
      .returning('*');

    return apiKey;
  }

  async findApiKeyByName(userId: string, name: string): Promise<ApiKey | null> {
    const [apiKey] = await this.db(PG_TABLE_NAMES.API_KEYS)
      .where({ user_id: userId, name })
      .select('*')
      .limit(1);

    return apiKey || null;
  }

  async listApiKeys(userId: string): Promise<ApiKey[]> {
    return this.db(PG_TABLE_NAMES.API_KEYS)
      .where('user_id', userId)
      .select('*');
  }

  async deleteApiKey(userId: string, apiKeyId: string): Promise<void> {
    await this.db(PG_TABLE_NAMES.API_KEYS)
      .where({ id: apiKeyId, user_id: userId })
      .delete();
  }

  async toggleApiKey(userId: string, apiKeyId: string, isActive: boolean): Promise<void> {
    await this.db(PG_TABLE_NAMES.API_KEYS)
      .where({ id: apiKeyId, user_id: userId })
      .update({ is_active: isActive });
  }

  async validateApiKey(key: string): Promise<{ userId: string; apiKeyId: string } | null> {
    const apiKey = await this.db(PG_TABLE_NAMES.API_KEYS)
      .where({ key, is_active: true })
      .select('user_id', 'id')
      .first();

    if (!apiKey) {
      return null;
    }

    return {
      userId: apiKey.user_id,
      apiKeyId: apiKey.id,
    };
  }
}
