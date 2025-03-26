import { createGraphRAGTool } from "@mastra/rag";
import { embeddingModel } from "../config"; // Import centralized embedding model
import { env } from "../../../config/environment"; // Assuming environment config is here

// Ensure DB connection string is set (needed for vector store name assumption)
if (!env.DATABASE_URL) { 
    throw new Error("DATABASE_URL environment variable is not set.");
}

/**
 * Tool for querying the document knowledge base using Graph RAG
 * to analyze relationships and connections between information.
 */
export const graphRagTool = createGraphRAGTool({
  // Assuming 'pgvector' is how you'll refer to your configured PgVector instance in Mastra setup
  vectorStoreName: "pgvector", 
  // Assuming 'documents' is the name of your table/index used for vector storage
  indexName: "documents", 
  model: embeddingModel, // Use centralized embedding model
  // Optional: Adjust graphOptions if needed
  // graphOptions: {
  //   dimension: 1536, // Match your embedding model dimension
  //   threshold: 0.7,
  //   randomWalkSteps: 100,
  //   restartProb: 0.15
  // },
  description: "Access and analyze relationships between information in the knowledge base to answer complex questions about connections, patterns, or comparisons between documents.",
});
