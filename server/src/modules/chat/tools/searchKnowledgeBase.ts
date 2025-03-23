import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { EmbeddingInputPort } from "../types";

const searchKnowledgeBaseSchema = z.object({
  query: z.string(),
  docId: z.string().optional(), // Add optional docId
});

export const searchKnowledgeBase = (embeddingInputPort: EmbeddingInputPort) => createTool({
  id: "SearchKnowledgeBase",
  inputSchema: searchKnowledgeBaseSchema,
  description: `Searches the current knowledge base for relevant documents.`,
  execute: async ({ context: { query, docId } }): Promise<Array<{ docId: string; score: number; content: string }>> => {
    console.log("Searching knowledge base for query: ", query, "and docId:", docId);
    try {
      const filters = docId ? { documentId: docId } : undefined; // Construct filters object
      const relevantDocuments = await embeddingInputPort.search(query, 5, filters); // Pass filters
      console.log("Found relevant documents: ", relevantDocuments);
      if (relevantDocuments) {
        return relevantDocuments.map(doc => ({
          docId: doc.docId,
          score: doc.score,
          content: doc.content
        }));
      } else {
        return [];
      }
    } catch (error) {
      console.error("Error searching knowledge base:", error);
      throw error;
    }
  },
});
