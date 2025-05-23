import { ollama } from 'ollama-ai-provider';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { env } from '../../config/environment';

export const embeddingModel = ollama.embedding('nomic-embed-text');

const openrouter = createOpenRouter({
    apiKey: env.OPENROUTER_API_KEY,
})

export const languageModel = openrouter("meta-llama/llama-4-maverick:free")
