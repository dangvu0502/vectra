import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { EmbeddingInputPort } from "../types";

const summarizeDocumentsSchema = z.object({
  docIds: z.array(z.string()),
  query: z.string().optional(), // Add an optional query
});

export const summarizeDocuments = (embeddingInputPort: EmbeddingInputPort) => createTool({
  id: "SummarizeDocuments",
  inputSchema: summarizeDocumentsSchema,
  description: "Retrieves relevant chunks from multiple documents, effectively providing a summary through retrieval.",
  execute: async ({ context: { docIds, query } }) => {
    if (embeddingInputPort.searchWithinDocuments) {
        const searchQuery = query || "summary"; // Use provided query or default to "summary"
        const results = await embeddingInputPort.searchWithinDocuments(docIds, searchQuery, 5); // Limit to 10 chunks

        // Combine the retrieved chunks
        const combinedContent = results.map(result => result.content).join('\\n');
        return combinedContent;

    } else {
      return "Summarization not supported."; // Or throw an error
    }
  },
});
