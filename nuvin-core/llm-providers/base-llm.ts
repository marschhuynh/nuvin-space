import type { CompletionParams, CompletionResult, LLMPort, UsageData, ToolCall } from '../ports';
import type { HttpTransport } from '../transports';
import { mergeChoices, normalizeUsage } from './llm-utils';

type CompletionBody = Omit<CompletionParams, 'maxTokens' | 'topP'> & {
  max_tokens?: number;
  top_p?: number;
  stream: boolean;
};

export abstract class BaseLLM implements LLMPort {
  protected transport!: HttpTransport; // lazily initialized
  protected apiUrl: string;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
  }

  // Implemented by provider to inject auth, headers, refresh, etc.
  protected abstract createTransport(): HttpTransport;

  private getTransport(): HttpTransport {
    if (!this.transport) this.transport = this.createTransport();
    return this.transport;
  }

  async generateCompletion(params: CompletionParams, signal?: AbortSignal): Promise<CompletionResult> {
    const body: CompletionBody = {
      model: params.model,
      messages: params.messages,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
      top_p: params.topP,
      stream: false,
    };

    if (params.tools && params.tools.length > 0) body.tools = params.tools as any;
    if (params.tool_choice && params.tools && params.tools.length > 0) body.tool_choice = params.tool_choice as any;

    const res = await this.getTransport().postJson(`${this.apiUrl}/chat/completions`, body, undefined, signal);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `LLM error ${res.status}`);
    }

    const data: any = await res.json();
    const merged = mergeChoices(data?.choices);
    const usage: UsageData | undefined = normalizeUsage(data?.usage);
    return { ...merged, ...(usage ? { usage } : {}) };
  }

  async streamCompletion(
    params: CompletionParams,
    handlers: { onChunk?: (delta: string) => void; onToolCallDelta?: (tc: ToolCall) => void } = {},
    signal?: AbortSignal,
  ): Promise<CompletionResult> {
    const body: CompletionBody = {
      model: params.model,
      messages: params.messages,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
      top_p: params.topP,
      stream: true,
    };

    if (params.tools && params.tools.length > 0) body.tools = params.tools as any;
    if (params.tool_choice && params.tools && params.tools.length > 0) body.tool_choice = params.tool_choice as any;

    const res = await this.getTransport().postStream(
      `${this.apiUrl}/chat/completions`,
      body,
      { Accept: 'text/event-stream' },
      signal,
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `LLM stream error ${res.status}`);
    }

    const reader = res.body?.getReader();
    if (!reader) return { content: '' };

    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let content = '';
    const mergedToolCalls: ToolCall[] = [];
    let usage: UsageData | undefined;

    const flushEvent = (rawEvent: string) => {
      const lines = rawEvent.split('\n');
      const dataLines: string[] = [];
      for (const ln of lines) {
        if (ln.startsWith('data:')) dataLines.push(ln.slice(5).trimStart());
      }
      if (dataLines.length === 0) return;
      const dataStr = dataLines.join('\n').trim();
      if (!dataStr || dataStr === '[DONE]') return;
      try {
        const evt = JSON.parse(dataStr) as any;
        
        // Capture usage data if available (usually in the final streaming event)
        if (evt?.usage) {
          usage = normalizeUsage(evt.usage);
        }
        
        const choices: any[] = Array.isArray(evt?.choices) ? evt.choices : [];
        for (const ch of choices) {
          const delta = ch?.delta ?? ch?.message ?? {};
          const textDelta: string | undefined = delta?.content;
          if (typeof textDelta === 'string' && textDelta.length > 0) {
            content += textDelta;
            handlers.onChunk?.(textDelta);
          }
          const toolDeltas: any[] = Array.isArray(delta?.tool_calls) ? delta.tool_calls : [];
          for (const td of toolDeltas) {
            const idx: number = td.index ?? mergedToolCalls.length;
            if (!mergedToolCalls[idx]) {
              mergedToolCalls[idx] = {
                id: td.id ?? `${idx}`,
                type: 'function',
                function: { name: td.function?.name ?? '', arguments: '' },
              };
            }
            if (typeof td.function?.name === 'string' && td.function.name) {
              mergedToolCalls[idx].function.name = td.function.name;
            }
            if (typeof td.function?.arguments === 'string' && td.function.arguments) {
              mergedToolCalls[idx].function.arguments += td.function.arguments;
            }
            if (handlers.onToolCallDelta) handlers.onToolCallDelta(mergedToolCalls[idx]);
          }
        }
      } catch {
        // ignore parse errors for non-data events
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';
      for (const part of parts) flushEvent(part);
    }
    if (buffer.trim()) flushEvent(buffer);

    const tool_calls = mergedToolCalls.length ? mergedToolCalls : undefined;
    return { content, ...(tool_calls ? { tool_calls } : {}), ...(usage ? { usage } : {}) };
  }
}
