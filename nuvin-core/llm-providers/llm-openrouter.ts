import type { LLMPort } from '../ports';
import { BaseLLM } from './base-llm';
import { FetchTransport, OpenRouterAuthTransport } from '../transports';

export class OpenRouterLLM extends BaseLLM implements LLMPort {
  constructor(private apiKey: string, apiUrl = 'https://openrouter.ai/api/v1') {
    super(apiUrl);
  }

  protected createTransport() {
    const base = new FetchTransport({ persistFile: '.history/http-log.json' })
    return new OpenRouterAuthTransport(base, this.apiKey);
  }
}
