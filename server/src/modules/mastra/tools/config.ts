import { openai } from "@ai-sdk/openai";

const embeddingModel = openai.embedding('text-embedding-3-small');

const commonRagToolConfig = {
  vectorStoreName: "pgvector", 
  indexName: "text_embeddings",
  model: embeddingModel, // Use centralized embedding model
};

export {
  commonRagToolConfig,
  embeddingModel,
}