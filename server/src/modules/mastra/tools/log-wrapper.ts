import { createTool, Tool } from "@mastra/core/tools";
import type { ToolExecutionContext } from "@mastra/core/tools"; // Import type separately
import type { AnyZodObject, ZodType, ZodTypeDef } from "zod";

// Allow schemas to be undefined or any ZodType, not just ZodObject
type MaybeSchema = ZodType | undefined;

interface LoggedToolOptions<InputSchema extends MaybeSchema, OutputSchema extends MaybeSchema> {
  originalTool: Tool<InputSchema, OutputSchema>;
  // Optional: override ID or description if needed, otherwise defaults are used
  id?: string;
  description?: string;
}

/**
 * Creates a wrapper tool that adds logging before and after executing the original tool.
 * Handles cases where original tool schemas might be undefined or not ZodObjects.
 */
export function createLoggedTool<InputSchema extends MaybeSchema, OutputSchema extends MaybeSchema>(
  options: LoggedToolOptions<InputSchema, OutputSchema>
): Tool<InputSchema, OutputSchema> {
  const { originalTool } = options;
  const toolId = options.id ?? `Logged_${originalTool.id}`;
  const description = options.description ?? `(Logged) ${originalTool.description}`;

  if (typeof originalTool.execute !== 'function') {
    throw new Error(`Original tool ${originalTool.id} does not have an executable function.`);
  }

  return createTool({
    id: toolId,
    description: description,
    // Pass schemas through, whether they are ZodObjects, other ZodTypes, or undefined
    inputSchema: originalTool.inputSchema as InputSchema,
    outputSchema: originalTool.outputSchema as OutputSchema,
    // Adjust execute params type based on the potentially broader InputSchema type
    execute: async (params: ToolExecutionContext<InputSchema>) => {
      const { mastra, context, threadId, resourceId } = params;
      const logger = mastra?.getLogger();
      const originalToolId = originalTool.id; // Capture original ID for logging

      if (logger) {
        logger.info(`[Tool Call] Executing ${originalToolId}`, { toolId: originalToolId, threadId, resourceId, context });
      }

      // Call the original tool's execute function
      // We pass the full params object as the original execute expects it
      // Add extra check inside execute to satisfy TS
      if (typeof originalTool.execute !== 'function') {
        // This should technically be unreachable due to the check outside, but satisfies TS
        throw new Error(`Original tool ${originalToolId} execute function is unexpectedly not available.`);
      }
      const result = await originalTool.execute(params);

      if (logger) {
        logger.info(`[Tool Call] Finished ${originalToolId}`, { toolId: originalToolId, threadId, resourceId, context, result });
      }
      return result;
    },
  });
}
