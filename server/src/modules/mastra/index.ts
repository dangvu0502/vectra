import { Mastra } from "@mastra/core";
import { myAgent, pgVector, postgresStore } from "./agent";

const mastra = new Mastra({
  vectors: {
    pgvector: pgVector
  },
  storage: postgresStore,
  agents: { myAgent },
});

export * from "./agent";
export * from "./tools";
export { mastra };

