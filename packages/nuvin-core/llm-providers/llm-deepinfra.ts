import type { LLMPort } from '../ports.js';
import { BaseLLM } from './base-llm.js';
import { FetchTransport, DeepInfraAuthTransport } from '../transports/index.js';

type DeepInfraOptions = { apiKey?: string; apiUrl?: string; httpLogFile?: string };

export type DeepInfraModel = {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  root: string;
  parent: string | null;
  metadata: {
    description: string;
    context_length: number;
    max_tokens: number;
    pricing: {
      input_tokens: number;
      output_tokens: number;
      cache_read_tokens?: number;
    };
    tags: string[];
  };
};

type DeepInfraModelsResponse = {
  object: string;
  data: DeepInfraModel[];
};

export class DeepInfraLLM extends BaseLLM implements LLMPort {
  private readonly opts: DeepInfraOptions;
  constructor(opts: DeepInfraOptions = {}) {
    super(opts.apiUrl || 'https://api.deepinfra.com/v1/openai');
    this.opts = opts;
  }

  protected createTransport() {
    const base = new FetchTransport({ persistFile: this.opts.httpLogFile });
    return new DeepInfraAuthTransport(base, this.opts.apiKey || process.env.DEEPINFRA_API_KEY, this.opts.apiUrl);
  }

  async getModels(signal?: AbortSignal): Promise<DeepInfraModel[]> {
    const transport = this.createTransport();
    const res = await transport.get('/models', undefined, signal);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch models: ${res.status} ${text}`);
    }

    const data: DeepInfraModelsResponse = await res.json();
    return data.data;
  }
}
