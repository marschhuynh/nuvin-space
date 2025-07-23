import type {
  LLMProvider,
  CompletionParams,
  CompletionResult,
  StreamChunk,
  ModelInfo,
} from './llm-provider';

export class OpenRouterProvider implements LLMProvider {
  readonly type = 'OpenRouter';
  private apiKey: string;
  private apiUrl: string = 'https://openrouter.ai';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateCompletion(
    params: CompletionParams,
    signal?: AbortSignal,
  ): Promise<CompletionResult> {
    const response = await fetch(`${this.apiUrl}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://nuvin.dev',
        'X-Title': 'Nuvin',
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature,
        max_tokens: params.maxTokens,
        top_p: params.topP,
        ...(params.tools && { tools: params.tools }),
        ...(params.tool_choice && { tool_choice: params.tool_choice }),
      }),
      signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${text}`);
    }

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content ?? '';
    const tool_calls = data.choices?.[0]?.message?.tool_calls;

    return { content, tool_calls };
  }

  async *generateCompletionStream(
    params: CompletionParams,
    signal?: AbortSignal,
  ): AsyncGenerator<string> {
    const response = await fetch(`${this.apiUrl}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://nuvin.dev',
        'X-Title': 'Nuvin',
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature,
        max_tokens: params.maxTokens,
        top_p: params.topP,
        stream: true,
        ...(params.tools && { tools: params.tools }),
        ...(params.tool_choice && { tool_choice: params.tool_choice }),
      }),
      signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${text}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Check for cancellation
      if (signal?.aborted) {
        throw new Error('Request cancelled by user');
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              yield delta;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  async *generateCompletionStreamWithTools(
    params: CompletionParams,
    signal?: AbortSignal,
  ): AsyncGenerator<StreamChunk> {
    const response = await fetch(`${this.apiUrl}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'HTTP-Referer':
          typeof window !== 'undefined'
            ? window.location.origin
            : 'http://localhost:3000',
        'X-Title': 'Nuvin Agent',
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature,
        max_tokens: params.maxTokens,
        top_p: params.topP,
        stream: true,
        ...(params.tools && { tools: params.tools }),
        ...(params.tool_choice && { tool_choice: params.tool_choice }),
      }),
      signal,
    });

    if (!response.ok || !response.body) {
      const text = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${text}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let buffer = '';
    let accumulatedToolCalls: any[] = [];

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;

      // Check for cancellation
      if (signal?.aborted) {
        throw new Error('Request cancelled by user');
      }

      if (value) {
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed === 'data: [DONE]') {
            if (accumulatedToolCalls.length > 0) {
              yield { tool_calls: accumulatedToolCalls, finished: true };
            }
            return;
          }
          if (!trimmed.startsWith('data:')) continue;

          try {
            const data = JSON.parse(trimmed.slice('data:'.length));
            const choice = data.choices?.[0];

            // Handle text content
            const delta = choice?.delta?.content;
            if (delta) {
              yield { content: delta };
            }

            // Handle tool calls
            if (choice?.delta?.tool_calls) {
              const toolCallDeltas = choice.delta.tool_calls;
              for (const tcDelta of toolCallDeltas) {
                if (tcDelta.index !== undefined) {
                  // Initialize tool call if needed
                  if (!accumulatedToolCalls[tcDelta.index]) {
                    accumulatedToolCalls[tcDelta.index] = {
                      id: tcDelta.id || '',
                      type: 'function',
                      function: {
                        name: '',
                        arguments: '',
                      },
                    };
                  }

                  const toolCall = accumulatedToolCalls[tcDelta.index];

                  // Update tool call with delta
                  if (tcDelta.id) toolCall.id = tcDelta.id;
                  if (tcDelta.function?.name) {
                    toolCall.function.name += tcDelta.function.name;
                  }
                  if (tcDelta.function?.arguments) {
                    toolCall.function.arguments += tcDelta.function.arguments;
                  }
                }
              }

              // Yield updated tool calls
              yield { tool_calls: [...accumulatedToolCalls] };
            }

            // Check if this is the final message
            if (choice?.finish_reason === 'tool_calls') {
              yield { tool_calls: accumulatedToolCalls, finished: true };
            }
          } catch (error) {
            console.warn('Failed to parse streaming data:', error);
          }
        }
      }
    }

    if (accumulatedToolCalls.length > 0) {
      yield { tool_calls: accumulatedToolCalls, finished: true };
    }
  }

  async getModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        console.warn(
          `OpenRouter models API error: ${response.status}. Returning empty models list.`,
        );
        return [];
      }

      const data = await response.json();
      const models = data.data || [];

      // Transform OpenRouter models to our ModelInfo format
      const transformedModels = models
        .map((model: any): ModelInfo => {
          return {
            id: model.id,
            name: model.name || model.id,
            contextLength:
              model.context_length ||
              model.top_provider?.context_length ||
              4096,
            inputCost: model.pricing?.prompt
              ? parseFloat(model.pricing.prompt) * 1000000
              : undefined,
            outputCost: model.pricing?.completion
              ? parseFloat(model.pricing.completion) * 1000000
              : undefined,
            modality: model.architecture?.modality || this.getModality(model),
            inputModalities:
              model.architecture?.input_modalities ||
              this.getInputModalities(model),
            outputModalities:
              model.architecture?.output_modalities ||
              this.getOutputModalities(model),
            supportedParameters: model.supported_parameters || [],
          };
        })
        .sort((a: ModelInfo, b: ModelInfo) => a.name.localeCompare(b.name));

      return transformedModels;
    } catch (error) {
      console.error('Failed to fetch OpenRouter models:', error);
      return [];
    }
  }

  private getModality(model: any): string {
    // Check model capabilities or ID patterns for modality
    if (
      model.capabilities?.includes('vision') ||
      model.id.includes('vision') ||
      model.id.includes('gpt-4o')
    ) {
      return 'multimodal';
    }
    return 'text';
  }

  private getInputModalities(model: any): string[] {
    const modalities = ['text'];
    if (
      model.capabilities?.includes('vision') ||
      model.id.includes('vision') ||
      model.id.includes('gpt-4o')
    ) {
      modalities.push('image');
    }
    if (model.capabilities?.includes('audio') || model.id.includes('audio')) {
      modalities.push('audio');
    }
    return modalities;
  }

  private getOutputModalities(model: any): string[] {
    const modalities = ['text'];
    if (model.capabilities?.includes('audio') || model.id.includes('audio')) {
      modalities.push('audio');
    }
    return modalities;
  }
}
