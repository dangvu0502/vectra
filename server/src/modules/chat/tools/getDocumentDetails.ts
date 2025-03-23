import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { EmbeddingInputPort } from "../types";

const getDocumentDetailsSchema = z.object({
  docId: z.string(),
});

export const getDocumentDetails = (embeddingInputPort: EmbeddingInputPort) => createTool({
  id: "GetDocumentDetails",
  inputSchema: getDocumentDetailsSchema,
  description: "Retrieves details for a specific document.",
  execute: async ({ context: { docId } }) => {
    console.log("Getting details for document ID: ", docId);
    try {
      if (embeddingInputPort.getDocument) {
        const document = await embeddingInputPort.getDocument(docId);
        console.log("Document details:", document);
        return document;
      }
      return "Document not found.";
    } catch (error) {
      console.error("Error getting document details:", error);
      throw error;
    }
  },
});
