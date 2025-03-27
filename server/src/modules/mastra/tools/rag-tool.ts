import { createVectorQueryTool } from "@mastra/rag";
// import { z } from "zod"; // Removed zod import
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
  vectorStoreName: "pgvector", // This likely refers to the configured PgVector instance name
  // Update indexName to the actual table name
  indexName: "mastra_vectors",
  model: embeddingModel, // Use centralized embedding model
  enableFilter: true, // Keep filtering enable

  // inputSchema removed - filtering is handled via arguments during tool call
  // Optional: Add reranking for better results if needed
  // reranker: {
  //   model: languageModel, // Use centralized language model if reranking
  //   options: { topK: 5 }
  // },
  description: "Access the knowledge base to find information from stored documents using vector search. To search within a specific document, provide a 'filter' object in the arguments, like { filter: { doc_id: '...' } }.",
});
