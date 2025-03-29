import { createVectorQueryTool } from "@mastra/rag";
// Import the shared config
import { commonRagToolConfig } from "./config";


/**
 * Tool for querying the document knowledge base using vector search, with filtering enabled.
 */
export const documentQueryTool = createVectorQueryTool({
  // Use shared configuration
  ...commonRagToolConfig,
  enableFilter: true, // Keep filtering enabled for this specific tool

  // inputSchema removed - filtering is handled via arguments during tool call
  // Optional: Add reranking for better results if needed
  // reranker: {
  //   model: languageModel, // Use centralized language model if reranking
  //   options: { topK: 5 }
  // },
  description: "Access the knowledge base to find information from stored documents using vector search. To search within a specific document, provide a 'filter' object in the arguments, like { filter: { doc_id: '...' } }.",
});
