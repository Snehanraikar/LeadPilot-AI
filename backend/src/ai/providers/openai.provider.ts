import OpenAI from 'openai';
import { AIProvider, GenerateOptions } from '../provider.interface';
import { env } from '../../config/env';
import { InternalError } from '../../utils/errors';

export class OpenAIProvider implements AIProvider {
  private readonly client: OpenAI;
  readonly modelId: string;
  readonly embeddingModelId: string;

  constructor() {
    if (!env.OPENAI_API_KEY) throw new InternalError('OPENAI_API_KEY is not configured');
    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    this.modelId = env.OPENAI_MODEL;
    this.embeddingModelId = env.OPENAI_EMBEDDING_MODEL;
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
    if (!content) throw new InternalError('OpenAI returned empty response');
    return content;
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.embeddingModelId,
      input: text,
      encoding_format: 'float',
    });

    const embedding = response.data[0]?.embedding;
    if (!embedding) throw new InternalError('OpenAI returned empty embedding');
    return embedding;
  }
}
