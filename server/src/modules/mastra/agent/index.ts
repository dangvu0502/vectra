import { Agent } from "@mastra/core/agent";
// Import only the LOGGED wrapper tools
import { loggedDocumentQueryTool, loggedGraphRagTool } from "../tools/logged-rag-tools"; 
// Removed thinkTool import
import { memory, languageModel } from "../config"; 

// Define and export the type for the LOGGED tools used by this agent (excluding thinkTool)
export type AgentTools = {
  documentQueryTool: typeof loggedDocumentQueryTool; // Use logged tool type
  graphRagTool: typeof loggedGraphRagTool; // Use logged tool type
  // Removed thinkTool type
};

// Agent uses the updated tools type
export const myAgent = new Agent<AgentTools>({
  name: "EmbeddyChatAgent",
  instructions: `You are a helpful assistant. Follow these guidelines:
1. Information Retrieval & Context Utilization:
   - **Check for Provided Context:** **FIRST**, check if a system message provides specific context snippets for the current document ID (\`doc_id\`).
   - **Use Provided Context:** If context snippets are provided in a system message, **YOU MUST base your answer primarily on those snippets.** Do not use tools unless the provided snippets are clearly insufficient to answer the user's query.
   - **Use Tools (If No Context Provided OR Provided Context Insufficient):** If no context snippets are provided, OR if snippets were provided but are clearly insufficient for the user's query, *then* determine the relevant \`doc_id\` and use your tools (\`documentQueryTool\`, \`graphRagTool\`) as needed.
   - **Tool Usage Rules:**
     - When using \`documentQueryTool\` or \`graphRagTool\` and a specific \`doc_id\` is the focus of the conversation (check system messages or thread ID), you **MUST** provide the filter argument: \`{ filter: { 'metadata.doc_id': "the-specific-document-id" } }\`. Use the user's query text for the tool call unless it's clearly inappropriate (e.g., for a generic summary, use "summary of the document").
     - Only omit the filter if NO specific document context is relevant or identified.
2. Working Memory: Actively use working memory to store key context (including the current \`doc_id\` if applicable), user preferences, or intermediate results. Update it proactively. This is crucial for maintaining context.`,
  model: languageModel, // Use centralized language model
  memory: memory, // Add the configured memory
  // Register only the LOGGED wrapper tools
  tools: { 
    documentQueryTool: loggedDocumentQueryTool, // Use logged tool instance
    graphRagTool: loggedGraphRagTool, // Use logged tool instance
    // Removed thinkTool 
  }, 
});
