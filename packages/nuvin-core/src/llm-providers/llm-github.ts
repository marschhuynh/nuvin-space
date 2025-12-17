import type { LLMPort, UsageData } from '../ports.js';
import { BaseLLM, LLMError } from './base-llm.js';
import { FetchTransport, GithubAuthTransport, RetryTransport, type RetryConfig } from '../transports/index.js';
import { normalizeModelInfo, deduplicateModels, type ModelInfo } from './model-limits.js';

type GithubOptions = {
  apiKey?: string;
  accessToken?: string;
  apiUrl?: string;
  httpLogFile?: string;
  retry?: Partial<RetryConfig>;
};

type GithubModel = {
  version: string;
  id: string;
  name: string;
  capable_endpoints?: string[];
  // Legacy or alternative field name for endpoints
  supported_endpoints?: string[];
  capabilities: {
    family: string;
    type: string;
    limits?: {
      max_context_window_tokens?: number;
      max_output_tokens?: number;
    };
  };
};

type GithubModelsResponse = {
  data: GithubModel[];
};

export class GithubLLM extends BaseLLM implements LLMPort {
  private readonly opts: GithubOptions;

  constructor(opts: GithubOptions = {}) {
    super(opts.apiUrl ?? 'https://api.individual.githubcopilot.com', { retry: opts.retry });
    this.opts = opts;
  }

  protected createTransport() {
    const base = new FetchTransport({
      persistFile: this.opts.httpLogFile,
      logLevel: 'INFO',
      enableConsoleLog: false,
      maxFileSize: 5 * 1024 * 1024,
      captureResponseBody: true,
    });
    const authTransport = new GithubAuthTransport(base, {
      baseUrl: this.opts.apiUrl,
      apiKey: this.opts.apiKey,
      accessToken: this.opts.accessToken,
    });

    if (this.retryConfig) {
      return new RetryTransport(authTransport, this.retryConfig);
    }
    return authTransport;
  }

  protected transformUsage(rawUsage: unknown): UsageData | undefined {
    if (!rawUsage) return undefined;

    const usage = rawUsage as {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
      prompt_tokens_details?: {
        cached_tokens?: number;
      };
      completion_tokens_details?: {
        reasoning_tokens?: number;
      };
    };

    return {
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
      total_tokens: usage.total_tokens,
      prompt_tokens_details: usage.prompt_tokens_details,
      completion_tokens_details: usage.completion_tokens_details,
    };
  }

  async getModels(signal?: AbortSignal): Promise<ModelInfo[]> {
    const res = await this.getTransport().get('/models', undefined, signal);

    if (!res.ok) {
      const text = await res.text();
      throw new LLMError(text || `Failed to fetch models: ${res.status}`, res.status);
    }

    const body = (await res.json()) as GithubModelsResponse;
    const models = body.data.map((m) => normalizeModelInfo('github', m as unknown as Record<string, unknown>));
    return deduplicateModels(models);
  }

  private handleError(error: unknown, model: string): never {
    if (error instanceof LLMError) {
      // Check for specific GitHub API error format
      try {
        // The error message might be a JSON string if it came from BaseLLM reading the body
        const errorBody = JSON.parse(error.message);
        if (errorBody?.error?.code === 'unsupported_api_for_model') {
          throw new LLMError(
            `The model '${model}' is not supported for chat completions. Please select a different model using '/model'.`,
            error.statusCode,
            false, // Not retryable
          );
        }
      } catch (e) {
        // If parsing fails or checks fail, just rethrow original
        if (e instanceof LLMError && e.message.includes('not supported')) {
          throw e;
        }
      }
    }
    throw error;
  }

  async generateCompletion(
    params: import('../ports.js').CompletionParams,
    signal?: AbortSignal,
  ): Promise<import('../ports.js').CompletionResult> {
    try {
      return await super.generateCompletion(params, signal);
    } catch (error) {
      this.handleError(error, params.model);
    }
  }

  async streamCompletion(
    params: import('../ports.js').CompletionParams,
    handlers?: {
      onChunk?: (delta: string, usage?: import('../ports.js').UsageData) => void;
      onToolCallDelta?: (tc: import('../ports.js').ToolCall) => void;
      onStreamFinish?: (finishReason?: string, usage?: import('../ports.js').UsageData) => void;
    },
    signal?: AbortSignal,
  ): Promise<import('../ports.js').CompletionResult> {
    try {
      return await super.streamCompletion(params, handlers, signal);
    } catch (error) {
      this.handleError(error, params.model);
    }
  }
}
