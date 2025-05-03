import { createClient } from 'redis';
import { env } from '@/config/environment';

// Create a reusable Redis connection instance for BullMQ using node-redis
// BullMQ requires a client instance.
export const redisConnection = createClient({
  url: env.REDIS_URL,
  // Add other node-redis specific options if needed, e.g., socket timeouts
}) as any; // Type assertion to work with connect-redis

redisConnection.on('error', (err) => {
  console.error('Redis Client Error for BullMQ:', err);
  // Consider adding more robust error handling/logging here
});

// Connection and shutdown are now handled in bootstrap.ts
// Remove .connect() call and signal handlers (SIGINT, SIGTERM)
