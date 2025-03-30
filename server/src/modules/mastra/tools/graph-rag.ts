import { createGraphRAGTool } from "@mastra/rag";
import { commonRagToolConfig } from "./config";

/**
 * Tool for querying the document knowledge base using Graph RAG
 * to analyze relationships and connections between information.
 */
export const graphRagTool = createGraphRAGTool({
  // Use shared configuration
  ...commonRagToolConfig,
  // Optional: Adjust graphOptions if needed for this specific tool
  // graphOptions: {
  //   dimension: 1536, // Match your embedding model dimension
  //   threshold: 0.7,
  //   randomWalkSteps: 100,
  //   restartProb: 0.15
  // },
  description: "Access and analyze relationships between information in the knowledge base using Graph RAG. When discussing a specific document, use the 'filter' parameter with the 'file_id' metadata field (e.g., filter: { file_id: '...' }) to focus the analysis on that document.",
});
