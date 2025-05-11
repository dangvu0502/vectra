import { Queue } from 'bullmq';
import { env } from '@/config/environment';
import type { ConnectionOptions } from 'bullmq';

export const LLM_PROCESSING_QUEUE_NAME = 'llm-processing';

// Defines the structure of the job data (payload) for LLM processing tasks.
export interface LlmJobData {
  jobType: 'relationshipExtraction' | 'entityExtraction'; // Type of LLM task
  chunkId: string; // ID of the ArangoDB chunk node
  chunkText: string; // Text content of the chunk
  // Consider adding documentId, relatedChunkIds, etc. as needed.
}

// Parses Redis URL to ConnectionOptions for BullMQ.
// BullMQ's ConnectionOptions are similar to ioredis options.
export const getRedisConnectionOptions = (): ConnectionOptions => {
  try {
    const url = new URL(env.REDIS_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port, 10),
      // TODO: Consider parsing password and db number from REDIS_URL if present.
    };
  } catch (error) {
    console.error("Invalid REDIS_URL format:", env.REDIS_URL, error);
    // Default fallback if REDIS_URL is invalid.
    return { host: 'localhost', port: 6379 };
  }
};

export const llmProcessingQueue = new Queue<LlmJobData>(LLM_PROCESSING_QUEUE_NAME, {
  connection: getRedisConnectionOptions(),
  defaultJobOptions: {
    attempts: 3, // Max 3 retry attempts for failed jobs
    backoff: {
      type: 'exponential',
      delay: 1000, // Initial backoff delay: 1 second
    },
    removeOnComplete: true,
    removeOnFail: 1000,    // Keep the last 1000 failed jobs for inspection
  },
});

// console.log(`BullMQ queue "${LLM_PROCESSING_QUEUE_NAME}" initialized.`); // Initialization logged in bootstrap

// Optional: Add listeners for queue events if needed for monitoring/logging
llmProcessingQueue.on('error', (error) => {
  console.error(`Error in BullMQ queue "${LLM_PROCESSING_QUEUE_NAME}":`, error);
});
