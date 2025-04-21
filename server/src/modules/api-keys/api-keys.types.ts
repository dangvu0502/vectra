import type { ApiKey, CreateApiKeyInput, ToggleApiKeyInput } from './api-keys.validation';

export type { ApiKey, CreateApiKeyInput, ToggleApiKeyInput };

export interface ApiKeyResponse {
  id: string;
  name: string;
  key: string;
  is_active: boolean;
  last_used_at: Date | null;
  created_at: Date;
} 