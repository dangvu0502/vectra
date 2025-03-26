import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * A tool for the agent to explicitly structure and log its reasoning, analysis, or planning steps.
 * Helps in processing tool outputs, verifying policy compliance, and guiding sequential decisions.
 */
export const thinkTool = createTool({
  id: "think",
  description: "Structures and logs the agent's reasoning process. Use before complex actions, after receiving tool output for analysis, for policy verification, or planning next steps. Clearly describe the analysis type, input data summary, reasoning steps, and conclusion.",
  inputSchema: z.object({
    analysis_type: z.enum([
        "tool_output_analysis", 
        "policy_compliance_check", 
        "sequential_planning", 
        "general_reasoning"
    ]).describe("The category of reasoning being performed."),
    input_summary: z.string().optional().describe("Brief summary of the data/context being analyzed (e.g., 'Output from documentQueryTool', 'User request details', 'Current plan step')."),
    reasoning_steps: z.string().describe("Detailed step-by-step thought process or analysis performed."),
    conclusion: z.string().describe("The outcome of the reasoning or the next step decided."),
  }),
  outputSchema: z.object({
    status: z.string(),
    logged_analysis_type: z.string(),
  }).describe("Confirmation that the structured thought was logged."),
  execute: async ({ context, threadId, resourceId }) => {
    // Log the structured thought. Consider using a structured logger (e.g., JSON format)
    // for easier parsing and analysis in a production environment.
    console.log(`[Agent Analysis] (Thread: ${threadId}, Resource: ${resourceId}) 
    Type: ${context.analysis_type}
    Input: ${context.input_summary || 'N/A'}
    Reasoning: ${context.reasoning_steps}
    Conclusion: ${context.conclusion}`);
    
    // Potentially add simple validation logic here if needed in the future.
    
    return { 
        status: "Structured thought logged successfully.",
        logged_analysis_type: context.analysis_type 
    }; 
  },
});
