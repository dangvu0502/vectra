import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import type { RedisClientType } from 'redis';
import { ApiKeyQueries } from './api-keys.queries';
import type { ApiKeyResponse, CreateApiKeyInput, ToggleApiKeyInput } from './api-keys.types';

// Constants for API key validation caching
const CACHE_PREFIX = 'apikey_valid:';
const VALID_KEY_TTL = 15 * 60; // Cache valid keys for 15 minutes
const INVALID_KEY_TTL = 60;    // Cache invalid key attempts for 1 minute
const INVALID_MARKER = 'invalid'; // Marker for known invalid keys in cache

export class ApiKeyService {
  constructor(
    private readonly queries: ApiKeyQueries,
    private readonly redis: RedisClientType<any, any, any> // TODO: Specify more precise Redis client generics if possible
  ) {}

  async findApiKeyByName(userId: string, name: string): Promise<ApiKeyResponse | null> {
    // Note: Caching could be added here for performance if this method is called frequently.
    return this.queries.findApiKeyByName(userId, name);
  }

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
    const cacheKey = `${CACHE_PREFIX}${key}`;

    try {
      const cachedValue = await this.redis.get(cacheKey);

      if (cachedValue) {
        if (cachedValue === INVALID_MARKER) {
          return null; // Key is known to be invalid from cache
        }
        try {
          const parsedValue = JSON.parse(cachedValue);
          // Safeguard for potential old cache structure { user_id, id }
          if (parsedValue.user_id) {
             console.warn(`[ApiKeyService] Mapping old cache structure for key ${key}`);
             return { userId: parsedValue.user_id, apiKeyId: parsedValue.id };
          }
          return parsedValue; // Assume correct structure { userId, apiKeyId }
        } catch (parseError) {
          console.error(`Error parsing cached API key data for key ${key}:`, parseError);
          // Proceed to DB query if cache data is corrupted
        }
      }

      // Cache miss - query database
      const dbResult = await this.queries.validateApiKey(key);

      // Update cache based on DB result
      if (dbResult) {
        await this.redis.set(cacheKey, JSON.stringify(dbResult), { EX: VALID_KEY_TTL });
        return dbResult;
      } else {
        await this.redis.set(cacheKey, INVALID_MARKER, { EX: INVALID_KEY_TTL });
        return null;
      }
    } catch (error) {
      console.error(`Error during API key validation or caching for key ${key}:`, error);
      // Fallback: Try direct DB query if cache interaction fails.
      // This prevents cache issues from completely blocking validation.
      try {
        return await this.queries.validateApiKey(key);
      } catch (dbError) {
        console.error(`Fallback DB query failed for key ${key}:`, dbError);
        return null; // Both cache and DB failed
      }
    }
  }

}
