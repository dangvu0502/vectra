import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import type { RedisClientType } from 'redis'; // Import correct type from 'redis' package
import { ApiKeyQueries } from './api-keys.queries';
import type { ApiKeyResponse, CreateApiKeyInput, ToggleApiKeyInput } from './api-keys.types';

// Constants for caching
const CACHE_PREFIX = 'apikey_valid:';
const VALID_KEY_TTL = 15 * 60; // 15 minutes in seconds
const INVALID_KEY_TTL = 60; // 1 minute in seconds
const INVALID_MARKER = 'invalid'; // Marker for invalid keys in cache

export class ApiKeyService {
  // Inject Redis client
  constructor(
    private readonly queries: ApiKeyQueries,
    private readonly redis: RedisClientType<any, any, any> // Use the correct type, specify generics if known or use any
  ) {}

  async findApiKeyByName(userId: string, name: string): Promise<ApiKeyResponse | null> {
    // Note: Caching could be added here too if needed, but focusing on validateApiKey first
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
    // Restore Caching Logic
    const cacheKey = `${CACHE_PREFIX}${key}`;

    try {
      // 1. Check cache first
      const cachedValue = await this.redis.get(cacheKey);

      if (cachedValue) {
        if (cachedValue === INVALID_MARKER) {
          // Key is known to be invalid from cache
          return null;
        }
        try {
          // Return cached valid key info
          const parsedValue = JSON.parse(cachedValue);
          // Safeguard: Handle potential old cache structure { user_id, id }
          if (parsedValue.user_id) {
             console.warn(`[ApiKeyService] Mapping old cache structure for key ${key}`);
             return { userId: parsedValue.user_id, apiKeyId: parsedValue.id };
          }
          // Assume correct structure { userId, apiKeyId } otherwise
          return parsedValue;
        } catch (parseError) {
          console.error(`Error parsing cached API key data for key ${key}:`, parseError);
          // Proceed to DB query if cache data is corrupted
        }
      }

      // 2. Cache miss - query database
      const dbResult = await this.queries.validateApiKey(key); // This now returns { userId, apiKeyId }

      // 3. Update cache based on DB result
      if (dbResult) {
        // Cache valid key info (already in correct format)
        await this.redis.set(cacheKey, JSON.stringify(dbResult), { EX: VALID_KEY_TTL });
        return dbResult;
      } else {
        // Cache invalid marker
        await this.redis.set(cacheKey, INVALID_MARKER, { EX: INVALID_KEY_TTL });
        return null;
      }
    } catch (error) {
      console.error(`Error during API key validation or caching for key ${key}:`, error);
      // Fallback: Try direct DB query if cache interaction fails, but log the error
      // This prevents cache issues from completely blocking validation
      try {
        return await this.queries.validateApiKey(key);
      } catch (dbError) {
        console.error(`Fallback DB query failed for key ${key}:`, dbError);
        return null; // Return null if both cache and DB fail catastrophically
      }
    }
    // End of Original Caching Logic
  }

}
