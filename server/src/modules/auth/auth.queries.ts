import { db } from '@/database/connection';
// Removed incorrect import: import { USERS_TABLE } from '@/database/constants';
import { v4 as uuidv4 } from 'uuid';
import type { UserProfile } from './auth.types';

/**
 * Finds a user by provider and provider ID.
 * @param provider - The authentication provider (e.g., 'google').
 * @param providerId - The user's ID from the provider.
 * @returns The user profile if found, otherwise undefined.
 */
export const findUserByProviderQuery = async (
  provider: string,
  providerId: string
): Promise<UserProfile | undefined> => {
  return db('users') // Use hardcoded table name
    .where({ provider: provider, provider_id: providerId })
    .first();
};

/**
 * Creates a new user in the database.
 * @param userData - The user data to insert.
 * @returns The newly created user profile.
 */
export const createUserQuery = async (userData: {
  provider: string;
  provider_id: string;
  email: string | null;
  display_name?: string;
  profile_picture_url?: string | null;
}): Promise<UserProfile> => {
  const [newUser] = await db('users') // Use hardcoded table name
    .insert({
      id: uuidv4(),
      ...userData,
    })
    .returning('*');
  return newUser;
};

/**
 * Finds a user by their internal ID.
 * @param id - The internal user ID.
 * @returns The user profile if found, otherwise undefined.
 */
export const findUserByIdQuery = async (id: string): Promise<UserProfile | undefined> => {
  return db('users').where({ id }).first(); // Use hardcoded table name
};
