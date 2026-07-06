import { env } from '../../config/env';
import { InternalError } from '../../utils/errors';

// HuggingFace Inference API — free tier, no credit card needed.
// Model: BAAI/bge-small-en-v1.5 (384 dimensions, fast, high quality)
export class HuggingFaceEmbedder {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly endpoint: string;

  constructor() {
    if (!env.HF_API_KEY) throw new InternalError('HF_API_KEY is not configured');
    this.apiKey = env.HF_API_KEY;
    this.model = env.HF_EMBEDDING_MODEL;
    this.endpoint = `https://router.huggingface.co/hf-inference/models/${this.model}/pipeline/feature-extraction`;
  }

  async embed(text: string): Promise<number[]> {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new InternalError(`HuggingFace embedding failed: ${err}`);
    }

    const data = await res.json() as number[] | number[][];

    // HF returns either a flat array or nested (batch) — normalize
    if (Array.isArray(data[0])) {
      return data[0] as number[];
    }
    return data as number[];
  }
}
