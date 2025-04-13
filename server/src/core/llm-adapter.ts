import { ollama } from 'ollama-ai-provider';

// export const llamaIndexOllamaCogito = new LlamaIndexOllama({ model: "cogito:latest" }) as any; // Corrected variable name

export const embeddingModel = ollama.embedding('nomic-embed-text'); // Corrected variable name

export const languageModel = ollama('cogito:latest')
