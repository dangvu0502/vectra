import { Ollama as LlamaIndexOllama } from "@llamaindex/ollama"; // Import OllamaEmbedding from here
import { ollama } from 'ollama-ai-provider';

export const llamaIndexOllamaCogito = new LlamaIndexOllama({ model: "cogito:latest" }) as any; // Corrected variable name

export const nomicEmbedText = ollama.embedding('nomic-embed-text'); // Corrected variable name

export const cogito = ollama('cogito:latest')
