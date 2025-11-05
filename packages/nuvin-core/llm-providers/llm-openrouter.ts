import type { CompletionParams, CompletionResult, LLMPort } from '../ports.js';
import { BaseLLM } from './base-llm.js';
import { FetchTransport, OpenRouterAuthTransport } from '../transports/index.js';

type OpenRouterOptions = { 
  apiKey?: string; 
  apiUrl?: string; 
  httpLogFile?: string;
  enablePromptCaching?: boolean;
  includeUsage?: boolean;
};

export type OpenRouterModel = {
  id: string;
  canonical_slug: string;
  hugging_face_id: string;
  name: string;
  created: number;
  description: string;
  context_length: number;
  architecture: {
    modality: string;
    input_modalities: string[];
    output_modalities: string[];
    tokenizer: string;
    instruct_type: string | null;
  };
  pricing: {
    prompt: string;
    completion: string;
    request: string;
    image: string;
    web_search: string;
    internal_reasoning: string;
    input_cache_read: string;
  };
  top_provider: {
    context_length: number;
    max_completion_tokens: number | null;
    is_moderated: boolean;
  };
  per_request_limits: {
    prompt_tokens: string;
    completion_tokens: string;
  } | null;
  supported_parameters: string[];
  default_parameters: {
    temperature: number | null;
    top_p: number | null;
    frequency_penalty: number | null;
  };
};

type OpenRouterModelsResponse = {
  data: OpenRouterModel[];
};

export class OpenRouterLLM extends BaseLLM implements LLMPort {
  private readonly includeUsage: boolean;
  
  constructor(opts: OpenRouterOptions = {}) {
    const { enablePromptCaching = true, includeUsage = true, ...restOpts } = opts;
    super('https://openrouter.ai/api/v1', { enablePromptCaching });
    this.includeUsage = includeUsage;
    this.opts = restOpts;
  }

  private readonly opts: Omit<OpenRouterOptions, 'enablePromptCaching' | 'includeUsage'>;

  protected createTransport() {
    const base = new FetchTransport({ persistFile: this.opts.httpLogFile });
    return new OpenRouterAuthTransport(base, this.opts.apiKey, this.apiUrl);
  }

  async generateCompletion(params: CompletionParams, signal?: AbortSignal): Promise<CompletionResult> {
    let enhancedParams = params;
    
    if (this.includeUsage && !enhancedParams.usage) {
      enhancedParams = { ...enhancedParams, usage: { include: true } };
    }
    
    return super.generateCompletion(enhancedParams, signal);
  }

  async streamCompletion(
    params: CompletionParams,
    handlers?: {
      onChunk?: (delta: string, usage?: import('../ports.js').UsageData) => void;
      onToolCallDelta?: (tc: import('../ports.js').ToolCall) => void;
      onStreamFinish?: (finishReason?: string, usage?: import('../ports.js').UsageData) => void;
    },
    signal?: AbortSignal,
  ): Promise<CompletionResult> {
    let enhancedParams = params;
    
    if (this.includeUsage && !enhancedParams.usage) {
      enhancedParams = { ...enhancedParams, usage: { include: true } };
    }
    
    return super.streamCompletion(enhancedParams, handlers, signal);
  }

  async getModels(signal?: AbortSignal): Promise<OpenRouterModel[]> {
    const transport = this.createTransport();
    const res = await transport.get('/models', undefined, signal);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch models: ${res.status} ${text}`);
    }

    const data: OpenRouterModelsResponse = await res.json();
    return data.data;
  }
}
