import { ollama } from 'ollama-ai-provider';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { env } from '@/config/environment';

export const embeddingModel = ollama.embedding('nomic-embed-text'); // Corrected variable name

// export const languageModel = ollama('cogito:latest')

const openrouter = createOpenRouter({
    apiKey: env.OPENROUTER_API_KEY,
})

export const languageModel = openrouter("google/gemini-2.0-flash-thinking-exp:free")