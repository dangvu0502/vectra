import type { Knex } from 'knex';
import { TEST_USER_ID } from '../constants';

// Constant test user ID that we can reference in other parts of the application
export async function seed(knex: Knex): Promise<void> {
  // First, delete existing entries
  await knex('users').del();

  // Then insert the seed data
  await knex('users').insert([
    {
      id: TEST_USER_ID,
      provider: 'test',
      provider_id: 'test_user_1',
      email: 'test@example.com',
      display_name: 'Test User',
      profile_picture_url: null,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
} 