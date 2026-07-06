import OpenAI from 'openai';
import { AIProvider, GenerateOptions } from '../provider.interface';
import { env } from '../../config/env';
import { InternalError } from '../../utils/errors';

// Groq is OpenAI-API-compatible — point the client at their base URL.
// Free tier: 14,400 requests/day, 30 req/min on llama-3.1-8b-instant.
export class GroqProvider implements AIProvider {
  private readonly client: OpenAI;
  readonly modelId: string;
  readonly embeddingModelId: string;

  constructor() {
    if (!env.GROQ_API_KEY) throw new InternalError('GROQ_API_KEY is not configured');
    this.client = new OpenAI({
      apiKey: env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });
    this.modelId = env.GROQ_MODEL;
    // Groq has no embedding endpoint — embeddings are handled by HuggingFaceProvider
    this.embeddingModelId = env.HF_EMBEDDING_MODEL;
  }

  async generate(prompt: string, options: GenerateOptions = {}): Promise<string> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await this.client.chat.completions.create({
      model: this.modelId,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new InternalError('Groq returned empty response');
    return content;
  }

  // Delegates to HuggingFaceEmbedder — called by EmbeddingService
  async embed(text: string): Promise<number[]> {
    const { HuggingFaceEmbedder } = await import('./hf-embedder');
    return new HuggingFaceEmbedder().embed(text);
  }
}
