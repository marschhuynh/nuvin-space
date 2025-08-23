import { BaseLLMProvider } from './base-provider';
import { extractValue } from './utils';
import type { ModelInfo, CompletionParams, CompletionResult, StreamChunk } from './types/base';

export class DeepInfraProvider extends BaseLLMProvider {
  constructor(apiKey: string) {
    super({
      providerName: 'DeepInfra',
      apiKey,
      apiUrl: 'https://api.deepinfra.com/v1/openai',
    });
  }

  async generateCompletion(params: CompletionParams, signal?: AbortSignal): Promise<CompletionResult> {
    const response = await this.makeRequest('/chat/completions', {
      body: {
        model: params.model,
        messages: params.messages,
        temperature: params.temperature,
        max_tokens: params.maxTokens,
        top_p: params.topP,
        ...(params.tools && { tools: params.tools }),
        ...(params.tool_choice && { tool_choice: params.tool_choice }),
      },
      signal,
    });

    const data = await response.json();
    return this.createCompletionResult(data);
  }

  async *generateCompletionStream(params: CompletionParams, signal?: AbortSignal): AsyncGenerator<string> {
    const reader = await this.makeStreamingRequest('/chat/completions', params, signal);

    for await (const data of this.parseStream(reader, {}, signal)) {
      const content = extractValue(data, 'choices.0.delta.content');
      if (content) {
        yield content;
      }
    }
  }

  async *generateCompletionStreamWithTools(
    params: CompletionParams,
    signal?: AbortSignal,
  ): AsyncGenerator<StreamChunk> {
    const reader = await this.makeStreamingRequest('/chat/completions', params, signal);

    for await (const chunk of this.parseStreamWithTools(reader, {}, signal)) {
      yield chunk;
    }
  }

  protected parseRequestBody<T>(params: CompletionParams): T {
    return {
      model: params.model,
      messages: params.messages,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
      top_p: params.topP,
      stream: true,
      ...(params.tools && { tools: params.tools }),
      ...(params.tool_choice && { tool_choice: params.tool_choice }),
    } as T;
  }

  async getModels(): Promise<ModelInfo[]> {
    // DeepInfra doesn't provide a models endpoint like OpenAI
    // Instead, we'll return a curated list of popular models available on DeepInfra
    const popularModels: ModelInfo[] = [
      {
        id: 'moonshotai/Kimi-K2-Instruct',
        name: 'Kimi K2 Instruct',
        description: "Moonshot AI's Kimi K2 model for instruction following",
        contextLength: 128000,
        inputCost: 0.55,
        outputCost: 0.55,
        modality: 'text',
        inputModalities: ['text'],
        outputModalities: ['text'],
      },
      {
        id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        name: 'Llama 3.3 70B Instruct Turbo',
        description: "Meta's latest Llama 3.3 70B model optimized for instruction following",
        contextLength: 128000,
        inputCost: 0.59,
        outputCost: 0.79,
        modality: 'text',
        inputModalities: ['text'],
        outputModalities: ['text'],
      },
      {
        id: 'meta-llama/Meta-Llama-3.1-70B-Instruct',
        name: 'Llama 3.1 70B Instruct',
        description: "Meta's Llama 3.1 70B model for instruction following",
        contextLength: 128000,
        inputCost: 0.59,
        outputCost: 0.79,
        modality: 'text',
        inputModalities: ['text'],
        outputModalities: ['text'],
      },
      {
        id: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
        name: 'Llama 3.1 8B Instruct',
        description: "Meta's Llama 3.1 8B model for instruction following",
        contextLength: 128000,
        inputCost: 0.055,
        outputCost: 0.055,
        modality: 'text',
        inputModalities: ['text'],
        outputModalities: ['text'],
      },
      {
        id: 'meta-llama/Meta-Llama-3-8B-Instruct',
        name: 'Llama 3 8B Instruct',
        description: "Meta's Llama 3 8B model for instruction following",
        contextLength: 8192,
        inputCost: 0.055,
        outputCost: 0.055,
        modality: 'text',
        inputModalities: ['text'],
        outputModalities: ['text'],
      },
      {
        id: 'meta-llama/Llama-3.2-90B-Vision-Instruct',
        name: 'Llama 3.2 90B Vision Instruct',
        description: "Meta's multimodal Llama 3.2 90B model with vision capabilities",
        contextLength: 128000,
        inputCost: 0.59,
        outputCost: 0.79,
        modality: 'multimodal',
        inputModalities: ['text', 'image'],
        outputModalities: ['text'],
      },
      {
        id: 'deepseek-ai/DeepSeek-R1',
        name: 'DeepSeek R1',
        description: "DeepSeek's latest reasoning model",
        contextLength: 128000,
        inputCost: 0.55,
        outputCost: 2.19,
        modality: 'text',
        inputModalities: ['text'],
        outputModalities: ['text'],
      },
      {
        id: 'microsoft/WizardLM-2-8x22B',
        name: 'WizardLM 2 8x22B',
        description: "Microsoft's WizardLM 2 mixture of experts model",
        contextLength: 65536,
        inputCost: 0.65,
        outputCost: 0.65,
        modality: 'text',
        inputModalities: ['text'],
        outputModalities: ['text'],
      },
      {
        id: 'mistralai/Mistral-7B-Instruct-v0.3',
        name: 'Mistral 7B Instruct v0.3',
        description: "Mistral AI's 7B instruction-tuned model",
        contextLength: 32768,
        inputCost: 0.055,
        outputCost: 0.055,
        modality: 'text',
        inputModalities: ['text'],
        outputModalities: ['text'],
      },
      {
        id: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
        name: 'Mixtral 8x7B Instruct',
        description: "Mistral AI's mixture of experts 8x7B model",
        contextLength: 32768,
        inputCost: 0.24,
        outputCost: 0.24,
        modality: 'text',
        inputModalities: ['text'],
        outputModalities: ['text'],
      },
      {
        id: 'cognitivecomputations/dolphin-2.6-mixtral-8x7b',
        name: 'Dolphin 2.6 Mixtral 8x7B',
        description: "Cognitive Computations' uncensored Mixtral model",
        contextLength: 32768,
        inputCost: 0.24,
        outputCost: 0.24,
        modality: 'text',
        inputModalities: ['text'],
        outputModalities: ['text'],
      },
    ];

    return this.sortModels(popularModels);
  }
}
