import { Mastra } from "@mastra/core";
import { pgVector } from "./config"; // Import centralized pgVector instance
import { myAgent } from "./agent";

export const mastra = new Mastra({
  // Register the centralized vector store instance
  vectors: { 
    pgvector: pgVector // Use the name assumed in tool/memory config
  }, 
  agents: { myAgent },
});
