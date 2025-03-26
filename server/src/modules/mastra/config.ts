import { openai } from "@ai-sdk/openai";
import { Memory } from "@mastra/memory";
import { PostgresStore, PgVector } from "@mastra/pg";
import { env } from "../../config/environment"; // Assuming environment config is here

// --- Centralized Instances ---

// Ensure DB connection string is set
if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set.");
}

// Ensure OpenAI API key is set
if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is not set.");
}

// Centralized Vector Store Instance
export const pgVector = new PgVector(env.DATABASE_URL);

// Centralized Storage Instance
export const postgresStore = new PostgresStore({ connectionString: env.DATABASE_URL });

// Centralized Language Model Instance (Type inferred)
export const languageModel = openai('gpt-4o-mini');

// Centralized Embedding Model Instance (Type inferred)
export const embeddingModel = openai.embedding('text-embedding-3-small');


// --- Centralized Memory Configuration ---

/**
 * Centralized Mastra Memory configuration using PostgreSQL.
 */
export const memory = new Memory({
  storage: postgresStore, // Use centralized instance
  vector: pgVector,       // Use centralized instance
  embedder: embeddingModel, // Use centralized instance
  options: {
    semanticRecall: {
      topK: 5,
      messageRange: 2,
    },
    workingMemory: {
      enabled: true,
    },
    lastMessages: 10,
  },
});
