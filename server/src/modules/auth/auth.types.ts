export interface UserProfile {
  id: string;
  provider: string;
  provider_id: string;
  email: string | null; // Allow null based on the logic in index.ts
  display_name?: string;
  profile_picture_url?: string;
}
