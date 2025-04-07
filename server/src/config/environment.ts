import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string(),
  OPENAI_API_KEY: z.string(),
  UPLOAD_DIR: z.string().default('uploads'),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  API_BASE_URL: z.string().default('http://localhost:3000/api'),
  SESSION_SECRET: z.string(),
  // Removed FIRECRAWL_API_KEY line
});

export const env = envSchema.parse(process.env);

export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
