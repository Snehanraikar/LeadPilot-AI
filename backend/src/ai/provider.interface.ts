export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface AIProvider {
  generate(prompt: string, options?: GenerateOptions): Promise<string>;
  embed(text: string): Promise<number[]>;
  readonly modelId: string;
  readonly embeddingModelId: string;
}
