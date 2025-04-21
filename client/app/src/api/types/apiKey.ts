export interface ApiKey {
  id: string;
  name: string;
  key: string;
  user_id: string;
  created_at: string;
  last_used_at?: string;
}

export interface CreateApiKeyInput {
  name: string;
}

export interface UpdateApiKeyInput {
  name?: string;
} 