import { createTool } from "@mastra/core/tools";
import { z } from "zod";
// Import the ORIGINAL tools and their schemas/descriptions
import { documentQueryTool } from "./rag-tool";
import { graphRagTool } from "./graph-rag-tool";
import { filterDescription, queryTextDescription, topKDescription } from "@mastra/rag"; // Assuming these are exported

// --- Wrapper for documentQueryTool ---

const loggedDocumentQueryInputSchema = z.object({
  queryText: z.string().describe(queryTextDescription),
  topK: z.coerce.number().describe(topKDescription),
  filter: z.coerce.string().describe(filterDescription) // Assuming filter is always enabled based on original tool
}).passthrough();

export const loggedDocumentQueryTool = createTool({
  id: `Logged_${documentQueryTool.id}`, // Prefix ID
  description: `(Logged) ${documentQueryTool.description}`, // Prefix description
  inputSchema: loggedDocumentQueryInputSchema, // Use the schema matching the original
  outputSchema: documentQueryTool.outputSchema, // Use the original output schema
  execute: async (params) => {
    const { mastra, context, threadId, resourceId } = params;
    const logger = mastra?.getLogger();

    if (logger) {
      logger.info(`[Tool Call] Executing ${documentQueryTool.id}`, { toolId: documentQueryTool.id, threadId, resourceId, context });
    }

    // Call the original tool's execute function, ensuring it exists
    if (typeof documentQueryTool.execute !== 'function') {
        throw new Error(`Original tool ${documentQueryTool.id} does not have an executable function.`);
    }
    // We need to pass the full params object as the original execute expects it
    return documentQueryTool.execute(params);
  },
});


// --- Wrapper for graphRagTool ---

const loggedGraphRagInputSchema = z.object({
    queryText: z.string().describe(queryTextDescription),
    topK: z.coerce.number().describe(topKDescription),
    filter: z.coerce.string().describe(filterDescription) // Assuming filter is always enabled based on original tool
}).passthrough();


export const loggedGraphRagTool = createTool({
    id: `Logged_${graphRagTool.id}`, // Prefix ID
    description: `(Logged) ${graphRagTool.description}`, // Prefix description
    inputSchema: loggedGraphRagInputSchema, // Use the schema matching the original
    outputSchema: graphRagTool.outputSchema, // Use the original output schema
    execute: async (params) => {
        const { mastra, context, threadId, resourceId } = params;
        const logger = mastra?.getLogger();

        if (logger) {
            logger.info(`[Tool Call] Executing ${graphRagTool.id}`, { toolId: graphRagTool.id, threadId, resourceId, context });
        }

        // Call the original tool's execute function, ensuring it exists
        if (typeof graphRagTool.execute !== 'function') {
            throw new Error(`Original tool ${graphRagTool.id} does not have an executable function.`);
        }
        return graphRagTool.execute(params);
    },
});
