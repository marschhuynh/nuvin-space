import type { LLMPort } from '../ports.js';
import { BaseLLM } from './base-llm.js';
import { FetchTransport, createTransport } from '../transports/index.js';
import providerConfig from './llm-provider-config.json';
import { normalizeModelInfo, type ModelInfo } from './model-limits.js';

type ModelConfig = false | true | string | string[] | Array<{ id: string; name?: string; [key: string]: unknown }>;

interface ProviderConfig {
  name: string;
  type?: 'openai-compat' | 'anthropic';
  baseUrl: string;
  models?: ModelConfig;
  features: {
    promptCaching?: boolean;
    getModels?: boolean;
    includeUsage?: boolean;
  };
}

export interface LLMOptions {
  apiKey?: string;
  apiUrl?: string;
  httpLogFile?: string;
  enablePromptCaching?: boolean;
  includeUsage?: boolean;
  version?: string;
  providerName?: string;
}

const providers = providerConfig.providers as ProviderConfig[];

type ModelResponse = {
  id: string;
  [key: string]: unknown;
};

type ModelsListResponse = {
  data: ModelResponse[];
};

export class GenericLLM extends BaseLLM implements LLMPort {
  private readonly opts: LLMOptions;
  private readonly includeUsage: boolean;
  private readonly modelConfig: ModelConfig;
  private readonly providerName: string;

  constructor(baseUrl: string, modelConfig: ModelConfig, opts: LLMOptions = {}) {
    const { enablePromptCaching = false, includeUsage = false, providerName = 'unknown', ...restOpts } = opts;
    super(opts.apiUrl || baseUrl, { enablePromptCaching });
    this.includeUsage = includeUsage;
    this.modelConfig = modelConfig;
    this.providerName = providerName;
    this.opts = restOpts;
  }

  protected createTransport() {
    const base = new FetchTransport({
      persistFile: this.opts.httpLogFile,
      logLevel: 'INFO',
      enableConsoleLog: false,
      maxFileSize: 5 * 1024 * 1024,
      captureResponseBody: true,
    });
    return createTransport(base, this.apiUrl, this.opts.apiKey, this.opts.apiUrl, this.opts.version);
  }

  async getModels(signal?: AbortSignal): Promise<ModelInfo[]> {
    if (this.modelConfig === false) {
      throw new Error('Provider does not support getModels');
    }

    if (Array.isArray(this.modelConfig)) {
      return this.modelConfig.map((m) => {
        const raw = typeof m === 'string' ? { id: m } : m;
        return normalizeModelInfo(this.providerName, raw);
      });
    }

    if (typeof this.modelConfig === 'string') {
      const transport = this.createTransport();
      const res = await transport.get(this.modelConfig, undefined, signal);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to fetch models: ${res.status} ${text}`);
      }

      const data: ModelsListResponse = await res.json();
      return data.data.map((m) => normalizeModelInfo(this.providerName, m));
    }

    const transport = this.createTransport();
    const res = await transport.get('/models', undefined, signal);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch models: ${res.status} ${text}`);
    }

    const data: ModelsListResponse = await res.json();
    return data.data.map((m) => normalizeModelInfo(this.providerName, m));
  }

  async generateCompletion(
    params: import('../ports.js').CompletionParams,
    signal?: AbortSignal,
  ): Promise<import('../ports.js').CompletionResult> {
    let enhancedParams = params;

    if (this.includeUsage && !enhancedParams.usage) {
      enhancedParams = { ...enhancedParams, usage: { include: true } };
    }

    return super.generateCompletion(enhancedParams, signal);
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
    let enhancedParams = params;

    if (this.includeUsage && !enhancedParams.usage) {
      enhancedParams = { ...enhancedParams, usage: { include: true } };
    }

    return super.streamCompletion(enhancedParams, handlers, signal);
  }
}

export interface CustomProviderDefinition {
  type?: 'openai-compat' | 'anthropic';
  baseUrl?: string;
  models?: ModelConfig;
}

function normalizeModelConfig(config: ProviderConfig): ModelConfig {
  if (config.models !== undefined) {
    return config.models;
  }
  return config.features.getModels ?? false;
}

function mergeProviders(customProviders?: Record<string, CustomProviderDefinition>): ProviderConfig[] {
  const merged = new Map<string, ProviderConfig>();

  for (const provider of providers) {
    merged.set(provider.name.toLowerCase(), provider);
  }

  if (customProviders) {
    for (const [name, custom] of Object.entries(customProviders)) {
      if (!custom.baseUrl) {
        continue;
      }

      const existing = merged.get(name.toLowerCase());
      const providerConfig: ProviderConfig = {
        name,
        type: custom.type ?? 'openai-compat',
        baseUrl: custom.baseUrl,
        models: custom.models ?? false,
        features: existing?.features ?? {
          promptCaching: false,
          getModels: custom.models !== false,
          includeUsage: false,
        },
      };

      merged.set(name.toLowerCase(), providerConfig);
    }
  }

  return Array.from(merged.values());
}

export function createLLM(
  providerName: string,
  options: LLMOptions = {},
  customProviders?: Record<string, CustomProviderDefinition>,
): LLMPort {
  const allProviders = mergeProviders(customProviders);
  const config = allProviders.find((p) => p.name.toLowerCase() === providerName.toLowerCase());

  if (!config) {
    throw new Error(`Unknown LLM provider: ${providerName}. Available: ${allProviders.map((p) => p.name).join(', ')}`);
  }

  const modelConfig = normalizeModelConfig(config);

  return new GenericLLM(config.baseUrl, modelConfig, {
    ...options,
    providerName: config.name,
    enablePromptCaching: options.enablePromptCaching ?? config.features.promptCaching,
    includeUsage: options.includeUsage ?? config.features.includeUsage,
  });
}

export function getAvailableProviders(customProviders?: Record<string, CustomProviderDefinition>): string[] {
  const allProviders = mergeProviders(customProviders);
  return allProviders.map((p) => p.name);
}

export function supportsGetModels(
  providerName: string,
  customProviders?: Record<string, CustomProviderDefinition>,
): boolean {
  const allProviders = mergeProviders(customProviders);
  const config = allProviders.find((p) => p.name.toLowerCase() === providerName.toLowerCase());
  if (!config) return false;
  const modelConfig = normalizeModelConfig(config);
  return modelConfig !== false;
}
