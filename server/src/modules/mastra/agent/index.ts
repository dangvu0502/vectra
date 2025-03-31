import { env } from "@/config/environment";
import { createLoggedTool, documentQueryTool, embeddingModel, graphRagTool } from "@/modules/mastra/tools";
import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { PgVector, PostgresStore } from "@mastra/pg";

const pgVector = new PgVector(env.DATABASE_URL); // Export pgVector

const postgresStore = new PostgresStore({ connectionString: env.DATABASE_URL });

const languageModel = openai('gpt-4o-mini');

const memory = new Memory({
  storage: postgresStore,
  vector: pgVector,
  embedder: embeddingModel,
  options: {
    semanticRecall: {
      topK: 5,
      messageRange: 2,
    },
    workingMemory: {
      enabled: true,
    },
    lastMessages: 10,
  },
});


const myAgent = new Agent({
  name: "EmbeddyChatAgent",
  instructions: `You are a helpful assistant. Follow these guidelines:
1. Information Retrieval & Context Utilization:
   - **Check for Provided Context:** **FIRST**, check if a system message provides specific context snippets for the current document ID (\`file_id\`).
   - **Use Provided Context:** If context snippets are provided in a system message, **YOU MUST base your answer primarily on those snippets.** Do not use tools unless the provided snippets are clearly insufficient to answer the user's query.
   - **Use Tools (If No Context Provided OR Provided Context Insufficient):** If no context snippets are provided, OR if snippets were provided but are clearly insufficient for the user's query, *then* determine the relevant \`file_id\` and use your tools (\`documentQueryTool\`, \`graphRagTool\`) as needed.
   - **Tool Usage Rules:**
     - When using \`documentQueryTool\` or \`graphRagTool\` and a specific \`file_id\` is the focus of the conversation (check system messages or thread ID), you **MUST** provide the filter argument: \`{ filter: { 'file_id': "the-specific-document-id" } }\`. Use the user's query text for the tool call unless it's clearly inappropriate (e.g., for a generic summary, use "summary of the document").
     - Only omit the filter if NO specific document context is relevant or identified.
2. Working Memory: Actively use working memory to store key context (including the current \`file_id\` if applicable), user preferences, or intermediate results. Update it proactively. This is crucial for maintaining context.`,
  model: languageModel, // Use centralized language model
  memory: memory, // Add the configured memory
  // Register only the LOGGED wrapper tools
  tools: {
    documentQueryTool: createLoggedTool({
      originalTool: documentQueryTool,
    }), // Use logged tool instance
    graphRagTool: createLoggedTool({
      originalTool: graphRagTool,
    })
  },
});

export {
  languageModel,
  myAgent, pgVector,
  postgresStore
};
