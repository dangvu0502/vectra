import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string(),
  UPLOAD_DIR: z.string().default('uploads'),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  SESSION_SECRET: z.string(),

  // ArangoDB Connection Details
  ARANGO_URL: z.string().default('http://localhost:8529'),
  ARANGO_DB_NAME: z.string().default('vectra_graph'),
  ARANGO_USERNAME: z.string().default('root'),
  ARANGO_PASSWORD: z.string(),

  // Redis Connection for BullMQ
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  OPENROUTER_API_KEY: z.string(),
  APP_URL: z.string().default('https://sonvh.shop'),
});

export const env = envSchema.parse(process.env);

export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
