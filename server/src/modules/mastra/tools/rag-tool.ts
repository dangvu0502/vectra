import { createVectorQueryTool } from "@mastra/rag";
import { embeddingModel } from "../config"; // Import centralized embedding model
import { env } from "../../../config/environment"; // Assuming environment config is here

// Ensure OPENAI_API_KEY is set in your environment (already checked in config.ts)
// if (!env.OPENAI_API_KEY) {
//   throw new Error("OPENAI_API_KEY environment variable is not set.");
// }
if (!env.DATABASE_URL) { // Check for DB URL as it's needed for vector store name assumption
    throw new Error("DATABASE_URL environment variable is not set.");
}

/**
 * Tool for querying the document knowledge base using vector search, with filtering enabled.
 */
export const documentQueryTool = createVectorQueryTool({
  // Assuming 'pgvector' is how you'll refer to your configured PgVector instance in Mastra setup
  vectorStoreName: "pgvector",
  // Assuming 'documents' is the name of your table/index used for vector storage
  indexName: "documents",
  model: embeddingModel, // Use centralized embedding model
  enableFilter: true, // Correct property name for enabling metadata filtering
  // Optional: Add reranking for better results if needed
  // reranker: {
  //   model: languageModel, // Use centralized language model if reranking
  //   options: { topK: 5 }
  // },
  description: "Access the knowledge base to find information from stored documents to answer user questions.",
});
