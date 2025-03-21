import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { DocumentEmbedding } from '../document/embedding';

export class ChatService {
  private static instance: ChatService | null = null;
  private readonly embedding: DocumentEmbedding;

  private constructor() {
    this.embedding = new DocumentEmbedding();
  }

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  static resetInstance(): void {
    ChatService.instance = null;
  }

  async chat(message: string): Promise<string> {
    const relevantDocuments = await this.embedding.search(message);

    const prompt = `
You are a helpful assistant that answers questions based solely on the provided context.
If the answer cannot be found in the context, respond with 'I am sorry, but I cannot answer that question based on the provided documents.'

Context:
${relevantDocuments.map(doc => doc.content).join('\n')}

User Question:
${message}
    `;

    const { text } = await generateText({
      model: openai('gpt-4-turbo'),
      prompt: prompt,
    });

    return text || 'No response from LLM.';
  }
}
