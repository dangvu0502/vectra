import { Agent } from "@mastra/core/agent";
// Import the LOGGED wrapper tools and the original thinkTool
import { loggedDocumentQueryTool, loggedGraphRagTool } from "../tools/logged-rag-tools"; 
import { thinkTool } from "../tools/think-tool"; 
import { memory, languageModel } from "../config"; 

// Define and export the type for the LOGGED tools used by this agent
export type AgentTools = {
  documentQueryTool: typeof loggedDocumentQueryTool; // Use logged tool type
  graphRagTool: typeof loggedGraphRagTool; // Use logged tool type
  thinkTool: typeof thinkTool;
};

// Agent uses the original tools type
export const myAgent = new Agent<AgentTools>({
  name: "EmbeddyChatAgent",
  instructions: `You are a helpful assistant. Follow these guidelines:
1. Information Retrieval:
   - **Determine Context:** First, analyze the conversation context (user query, history, working memory) to determine if a specific document ID (\`doc_id\`) is the focus. The context might be explicitly mentioned (e.g., "in document X...") or implied by the thread ID (e.g., 'doc-XYZ'). Use \`thinkTool\` with \`analysis_type: 'general_reasoning'\` to log this determination.
   - **Use documentQueryTool:** To find specific facts or text segments. **MANDATORY:** If a specific \`doc_id\` is identified as the focus (via thread ID like 'doc-XYZ' or explicit mention), you MUST provide a filter argument like \`{ filter: { doc_id: "the-specific-document-id" } }\` when calling this tool. Failure to provide the filter when a \`doc_id\` context exists will result in incorrect information retrieval. Only omit the filter if NO specific document context is relevant or identified.
   - **Use graphRagTool:** For complex questions requiring analysis of relationships, patterns, or comparisons. **MANDATORY:** If a specific \`doc_id\` is identified as the focus, you MUST provide a filter argument like \`{ filter: { doc_id: "the-specific-document-id" } }\` when calling this tool, as per its description. Failure to provide the filter when a \`doc_id\` context exists will result in incorrect information retrieval. Only omit the filter if NO specific document context is relevant or identified.
2. Structured Reasoning (thinkTool):
   - **Planning:** Before complex actions or calling tools (especially RAG tools), use \`thinkTool\` with \`analysis_type: 'sequential_planning'\` to outline your plan. **Crucially, specify the exact filter argument (e.g., \`{ filter: { doc_id: "..." } }\`) you will use if a \`doc_id\` context is present.**
   - After receiving tool output: Use \`thinkTool\` with \`analysis_type: 'tool_output_analysis'\` to summarize findings, analyze relevance, and decide the next step.
   - For policy checks: Use \`thinkTool\` with \`analysis_type: 'policy_compliance_check'\` to verify adherence to guidelines.
   - For general complex reasoning: Use \`thinkTool\` with \`analysis_type: 'general_reasoning'\` to break down the problem and document conclusions.
   - Always provide: input_summary (summary of input), detailed reasoning_steps, and a clear conclusion.
3. Working Memory: Actively use working memory to store key context, summaries from \`thinkTool\` conclusions, user preferences, or intermediate results. Update it proactively. This is crucial for maintaining context.`,
  model: languageModel, // Use centralized language model
  memory: memory, // Add the configured memory
  // Register the LOGGED wrapper tools and thinkTool
  tools: { 
    documentQueryTool: loggedDocumentQueryTool, // Use logged tool instance
    graphRagTool: loggedGraphRagTool, // Use logged tool instance
    thinkTool 
  }, 
});
