import type { UserProfile } from './auth.types';
import {
  findUserByProviderQuery,
  createUserQuery,
  findUserByIdQuery,
} from './auth.queries';

/**
 * Finds a user by provider and provider ID.
 * @param provider - The authentication provider (e.g., 'google').
 * @param providerId - The user's ID from the provider.
 * @returns The user profile if found, otherwise undefined.
 */
export const findUserByProvider = async (
  provider: string,
  providerId: string
): Promise<UserProfile | undefined> => {
  return findUserByProviderQuery(provider, providerId);
};

/**
 * Creates a new user in the database.
 * @param userData - The user data to insert.
 * @returns The newly created user profile.
 */
export const createUser = async (userData: {
  provider: string;
  provider_id: string;
  email: string | null;
  display_name?: string;
  profile_picture_url?: string | null;
}): Promise<UserProfile> => {
  return createUserQuery(userData);
};

/**
 * Finds a user by their internal ID.
 * @param id - The internal user ID.
 * @returns The user profile if found, otherwise undefined.
 */
export const findUserById = async (id: string): Promise<UserProfile | undefined> => {
  return findUserByIdQuery(id);
};
