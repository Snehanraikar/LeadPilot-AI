import { AIProvider, GenerateOptions } from '../provider.interface';
import { env } from '../../config/env';
import { InternalError } from '../../utils/errors';

interface OllamaGenerateResponse {
  response: string;
}

interface OllamaEmbedResponse {
  embedding: number[];
}

export class OllamaProvider implements AIProvider {
  private readonly baseUrl: string;
  readonly modelId: string;
  readonly embeddingModelId: string;

  constructor() {
    if (!env.OLLAMA_BASE_URL) throw new InternalError('OLLAMA_BASE_URL is not configured');
    this.baseUrl = env.OLLAMA_BASE_URL;
    this.modelId = env.OLLAMA_MODEL;
    this.embeddingModelId = env.OLLAMA_EMBEDDING_MODEL;
  }

  async generate(prompt: string, options: GenerateOptions = {}): Promise<string> {
    const fullPrompt = options.systemPrompt
      ? `System: ${options.systemPrompt}\n\nUser: ${prompt}`
      : prompt;

    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.modelId,
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.7,
          num_predict: options.maxTokens ?? 2048,
        },
      }),
    });

    if (!res.ok) throw new InternalError(`Ollama generate failed: ${res.statusText}`);
    const data = (await res.json()) as OllamaGenerateResponse;
    return data.response;
  }

  async embed(text: string): Promise<number[]> {
    const res = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.embeddingModelId, prompt: text }),
    });

    if (!res.ok) throw new InternalError(`Ollama embed failed: ${res.statusText}`);
    const data = (await res.json()) as OllamaEmbedResponse;
    return data.embedding;
  }
}
