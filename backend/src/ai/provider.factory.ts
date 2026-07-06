import { AIProvider } from './provider.interface';
import { OpenAIProvider } from './providers/openai.provider';
import { OllamaProvider } from './providers/ollama.provider';
import { GroqProvider } from './providers/groq.provider';
import { env } from '../config/env';

let _provider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (_provider) return _provider;

  switch (env.AI_PROVIDER) {
    case 'openai':
      _provider = new OpenAIProvider();
      break;
    case 'ollama':
      _provider = new OllamaProvider();
      break;
    case 'groq':
      _provider = new GroqProvider();
      break;
    default:
      _provider = new GroqProvider();
  }

  return _provider;
}
