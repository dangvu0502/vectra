import { createTool } from "@mastra/core/tools";
import type { EmbeddingInputPort } from "../types";

export const listKnowledgeBases = (embeddingInputPort: EmbeddingInputPort) => createTool({
  id: "ListKnowledgeBases",
  description: "Lists the available knowledge bases.",
  execute: async () => {
    if (embeddingInputPort.listKnowledgeBases) {
      return await embeddingInputPort.listKnowledgeBases();
    } else {
      return []; // Or throw an error, depending on desired behavior
    }
  },
});
