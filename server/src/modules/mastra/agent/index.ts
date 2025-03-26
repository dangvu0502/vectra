import { Agent } from "@mastra/core/agent";
import { documentQueryTool } from "../tools/rag-tool"; // Import the Vector RAG tool
import { graphRagTool } from "../tools/graph-rag-tool"; // Import the Graph RAG tool
import { thinkTool } from "../tools/think-tool"; // Import the Think tool
import { memory, languageModel } from "../config"; // Import centralized memory and language model

// Define and export the type for the tools used by this agent
export type AgentTools = {
  documentQueryTool: typeof documentQueryTool;
  graphRagTool: typeof graphRagTool;
  thinkTool: typeof thinkTool;
};

export const myAgent = new Agent<AgentTools>({
  name: "EmbeddyChatAgent",
  instructions: `You are a helpful assistant. Follow these guidelines:
1. Information Retrieval:
   - **Determine Context:** First, analyze the conversation context (user query, history, working memory) to determine if a specific document (\`doc_id\`) is the focus. You may use \`thinkTool\` with \`analysis_type: 'general_reasoning'\` to log this determination.
   - **Use documentQueryTool:** To find specific facts or text segments. **IMPORTANT:** If a specific \`doc_id\` is identified as the focus, you MUST use a metadata filter like \`{ "doc_id": "the-specific-document-id" }\` when calling this tool. Only search globally if no specific document context is relevant or identified.
   - **Use graphRagTool:** For complex questions requiring analysis of relationships, patterns, or comparisons across multiple documents. Filtering is not currently supported for this tool.
2. Structured Reasoning (thinkTool):
   - **Planning:** Before complex actions or calling tools (especially RAG tools), use \`thinkTool\` with \`analysis_type: 'sequential_planning'\` to outline your plan, including which tool to use and any necessary filters based on context analysis.
   - After receiving tool output: Use thinkTool with analysis_type 'tool_output_analysis' to summarize findings, analyze relevance, and decide the next step.
   - For policy checks: Use thinkTool with analysis_type 'policy_compliance_check' to verify adherence to guidelines.
   - For general complex reasoning: Use thinkTool with analysis_type 'general_reasoning' to break down the problem and document conclusions.
   - Always provide: input_summary (summary of input), detailed reasoning_steps, and a clear conclusion.
3. Working Memory: Actively use working memory to store key context, summaries from thinkTool conclusions, user preferences, or intermediate results. Update it proactively. This is crucial for maintaining context.`, // Simplified instructions formatting
  model: languageModel, // Use centralized language model
  memory: memory, // Add the configured memory
  tools: { documentQueryTool, graphRagTool, thinkTool }, // Register all tools
});
