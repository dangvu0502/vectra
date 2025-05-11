import { createClient } from 'redis';
import { env } from '@/config/environment';

export const redisConnection = createClient({
  url: env.REDIS_URL,
  // Add other node-redis specific options if needed, e.g., socket timeouts
}) as any; // Type assertion to work with connect-redis, ideally find a better type match

redisConnection.on('error', (err) => {
  console.error('Redis Client Error for BullMQ:', err);
  // Consider adding more robust error handling/logging here
});
