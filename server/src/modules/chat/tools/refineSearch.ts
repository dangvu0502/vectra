import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { EmbeddingInputPort } from "../types";

const refineSearchSchema = z.object({
  query: z.string(),
  filters: z.object({
    source: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }).optional(),
});

export const refineSearch = (embeddingInputPort: EmbeddingInputPort) => createTool({
  id: "RefineSearch",
  inputSchema: refineSearchSchema,
  description: "Refines a search query with additional filters.",
  execute: async ({ context: { query, filters } }) => {
    console.log("RefineSearch tool called with:", { query, filters });
    try {
      const results = await embeddingInputPort.search(query, 5, filters);
      console.log("RefineSearch results:", results);
      return results;
    } catch (error) {
      console.error("Error in RefineSearch:", error);
      throw error;
    }
  },
});
