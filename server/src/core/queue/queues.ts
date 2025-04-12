import { Queue } from 'bullmq';
import { env } from '@/config/environment'; // Need env for Redis URL
import type { ConnectionOptions } from 'bullmq'; // Use type-only import
// import Redis from 'ioredis'; // Remove unused ioredis import

// Define the name for the LLM processing queue
export const LLM_PROCESSING_QUEUE_NAME = 'llm-processing'; // Export the name

// Define the structure of the job data (payload)
// This can be expanded as needed for different LLM tasks
export interface LlmJobData {
  jobType: 'relationshipExtraction' | 'entityExtraction'; // Differentiate tasks
  chunkId: string; // The ID of the chunk node in ArangoDB
  chunkText: string; // The text content of the chunk
  // Add other relevant data as needed, e.g., documentId, relatedChunkIds
}

// Parse Redis URL to create ConnectionOptions for BullMQ
// BullMQ's ConnectionOptions align closely with ioredis options
export const getRedisConnectionOptions = (): ConnectionOptions => { // Export the function
  try {
    const url = new URL(env.REDIS_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port, 10),
      // Add password, db number etc. if present in the URL or needed
      // password: url.password || undefined,
      // db: url.pathname ? parseInt(url.pathname.slice(1), 10) : 0,
    };
  } catch (error) {
    console.error("Invalid REDIS_URL format:", env.REDIS_URL, error);
    // Fallback or throw error depending on desired behavior
    return { host: 'localhost', port: 6379 }; // Default fallback
  }
};


// Create the BullMQ queue instance
// Pass the connection options directly
export const llmProcessingQueue = new Queue<LlmJobData>(LLM_PROCESSING_QUEUE_NAME, {
  connection: getRedisConnectionOptions(),
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs up to 3 times
    backoff: {
      type: 'exponential',
      delay: 1000, // Exponential backoff starting at 1 second
    },
    removeOnComplete: true, // Keep queue clean by removing completed jobs
    removeOnFail: 1000,    // Keep failed jobs for a while (e.g., 1000 jobs) for inspection
  },
});

console.log(`BullMQ queue "${LLM_PROCESSING_QUEUE_NAME}" initialized.`);

// Optional: Add listeners for queue events if needed for monitoring/logging
llmProcessingQueue.on('error', (error) => {
  console.error(`Error in BullMQ queue "${LLM_PROCESSING_QUEUE_NAME}":`, error);
});

// Graceful shutdown is now handled centrally in bootstrap.ts
// Remove signal handlers (SIGINT, SIGTERM) and shutdownQueue function
