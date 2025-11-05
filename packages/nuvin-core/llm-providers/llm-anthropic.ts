import type { CompletionParams, CompletionResult, ChatMessage, ToolCall, UsageData } from '../ports.js';
import type { HttpTransport } from '../transports/index.js';
import { FetchTransport, AnthropicAuthTransport } from '../transports/index.js';

type AnthropicOptions = {
  apiKey?: string;
  oauth?: {
    type: 'oauth';
    access: string;
    refresh: string;
    expires: number;
  };
  apiUrl?: string;
  httpLogFile?: string;
};

type AnthropicContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };

type AnthropicMessage = {
  role: 'user' | 'assistant';
  content: string | AnthropicContentBlock[];
};

type AnthropicRequestBody = {
  model: string;
  messages: AnthropicMessage[];
  max_tokens: number;
  temperature?: number;
  top_p?: number;
  system?: string | Array<{ type: 'text'; text: string }>;
  tools?: Array<{
    name: string;
    description: string;
    input_schema: object;
  }>;
  tool_choice?: { type: 'auto' | 'any' | 'tool'; name?: string };
  stream?: boolean;
};

type AnthropicUsage = {
  input_tokens: number;
  output_tokens: number;
};

type AnthropicResponse = {
  id: string;
  type: 'message';
  role: 'assistant';
  content: AnthropicContentBlock[];
  model: string;
  stop_reason: string | null;
  usage: AnthropicUsage;
};

type AnthropicStreamEvent =
  | { type: 'message_start'; message: Partial<AnthropicResponse> }
  | { type: 'content_block_start'; index: number; content_block: Partial<AnthropicContentBlock> }
  | {
      type: 'content_block_delta';
      index: number;
      delta: { type: 'text_delta'; text: string } | { type: 'input_json_delta'; partial_json: string };
    }
  | { type: 'content_block_stop'; index: number }
  | { type: 'message_delta'; delta: { stop_reason: string | null }; usage: { output_tokens: number } }
  | { type: 'message_stop' }
  | { type: 'ping' };

export class AnthropicLLM {
  private transport: HttpTransport | null = null;
  private readonly opts: AnthropicOptions;
  private readonly apiUrl: string;

  constructor(opts: AnthropicOptions = {}) {
    this.opts = opts;
    this.apiUrl = opts.apiUrl || 'https://api.anthropic.com';
  }

  private getTransport(): HttpTransport {
    if (!this.transport) {
      const base = new FetchTransport({
        persistFile: this.opts.httpLogFile,
      });
      this.transport = new AnthropicAuthTransport(base, {
        apiKey: this.opts.apiKey,
        oauth: this.opts.oauth,
        baseUrl: this.apiUrl,
      });
    }
    return this.transport;
  }

  private transformToAnthropicMessages(messages: ChatMessage[]): {
    system?: Array<{ type: 'text'; text: string }>;
    messages: AnthropicMessage[];
  } {
    const systemMessages: string[] = [];
    const anthropicMessages: AnthropicMessage[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        if (typeof msg.content === 'string') {
          systemMessages.push(msg.content);
        } else if (Array.isArray(msg.content)) {
          for (const part of msg.content) {
            if (part.type === 'text') {
              systemMessages.push(part.text);
            }
          }
        }
        continue;
      }

      if (msg.role === 'tool') {
        const lastMsg = anthropicMessages[anthropicMessages.length - 1];
        if (lastMsg && lastMsg.role === 'user' && Array.isArray(lastMsg.content)) {
          lastMsg.content.push({
            type: 'tool_result',
            tool_use_id: msg.tool_call_id || '',
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
          });
        } else {
          anthropicMessages.push({
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: msg.tool_call_id || '',
                content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
              },
            ],
          });
        }
        continue;
      }

      const content: AnthropicContentBlock[] = [];

      if (typeof msg.content === 'string' && msg.content) {
        content.push({ type: 'text', text: msg.content });
      } else if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.type === 'text') {
            content.push({ type: 'text', text: part.text });
          } else if (part.type === 'image_url') {
            const url = part.image_url.url;
            if (url.startsWith('data:')) {
              const match = url.match(/^data:([^;]+);base64,(.+)$/);
              if (match) {
                content.push({
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: match[1],
                    data: match[2],
                  },
                });
              }
            }
          }
        }
      }

      if (msg.tool_calls) {
        for (const toolCall of msg.tool_calls) {
          content.push({
            type: 'tool_use',
            id: toolCall.id,
            name: toolCall.function.name,
            input: JSON.parse(toolCall.function.arguments || '{}'),
          });
        }
      }

      if (content.length > 0) {
        anthropicMessages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: content.length === 1 && content[0].type === 'text' ? content[0].text : content,
        });
      }
    }

    const result: { system?: Array<{ type: 'text'; text: string }>; messages: AnthropicMessage[] } = {
      messages: anthropicMessages,
    };

    if (systemMessages.length > 0) {
      result.system = [
        {
          type: 'text',
          text: "You are Claude Code, Anthropic's official CLI for Claude.",
        },
        { type: 'text', text: systemMessages.join('\n\n') },
      ];
    }

    return result;
  }

  private transformTools(tools?: CompletionParams['tools']) {
    if (!tools || tools.length === 0) return undefined;

    return tools.map((tool) => ({
      name: tool.function.name,
      description: tool.function.description,
      input_schema: tool.function.parameters,
    }));
  }

  private transformToolChoice(toolChoice?: CompletionParams['tool_choice']) {
    if (!toolChoice || toolChoice === 'auto') {
      return { type: 'auto' as const };
    }
    if (toolChoice === 'none') {
      return undefined;
    }
    if (typeof toolChoice === 'object' && toolChoice.type === 'function') {
      return { type: 'tool' as const, name: toolChoice.function.name };
    }
    return { type: 'auto' as const };
  }

  private transformResponse(response: AnthropicResponse): CompletionResult {
    let content = '';
    const tool_calls: ToolCall[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        content += block.text;
      } else if (block.type === 'tool_use') {
        tool_calls.push({
          id: block.id,
          type: 'function',
          function: {
            name: block.name,
            arguments: JSON.stringify(block.input),
          },
        });
      }
    }

    const usage: UsageData = {
      prompt_tokens: response.usage.input_tokens,
      completion_tokens: response.usage.output_tokens,
      total_tokens: response.usage.input_tokens + response.usage.output_tokens,
    };

    return {
      content,
      ...(tool_calls.length > 0 ? { tool_calls } : {}),
      usage,
    };
  }

  async generateCompletion(params: CompletionParams, signal?: AbortSignal): Promise<CompletionResult> {
    const { system, messages } = this.transformToAnthropicMessages(params.messages);
    const tools = this.transformTools(params.tools);
    const tool_choice = tools ? this.transformToolChoice(params.tool_choice) : undefined;

    const body: AnthropicRequestBody = {
      model: params.model,
      messages,
      max_tokens: params.maxTokens ?? 10240,
      temperature: params.temperature,
      stream: false,
      // ...(params.topP !== undefined && { top_p: params.topP }),
      ...(system && { system }),
      ...(tools && { tools }),
      ...(tool_choice && { tool_choice }),
    };

    const res = await this.getTransport().postJson('/v1/messages', body, undefined, signal);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Anthropic API error ${res.status}`);
    }

    const data: AnthropicResponse = await res.json();
    return this.transformResponse(data);
  }

  async streamCompletion(
    params: CompletionParams,
    handlers: {
      onChunk?: (delta: string, usage?: UsageData) => void;
      onToolCallDelta?: (tc: ToolCall) => void;
      onStreamFinish?: (finishReason?: string, usage?: UsageData) => void;
    } = {},
    signal?: AbortSignal,
  ): Promise<CompletionResult> {
    const { system, messages } = this.transformToAnthropicMessages(params.messages);
    const tools = this.transformTools(params.tools);
    const tool_choice = tools ? this.transformToolChoice(params.tool_choice) : undefined;

    const body: AnthropicRequestBody = {
      model: params.model,
      messages,
      max_tokens: params.maxTokens ?? 10240,
      temperature: params.temperature,
      stream: true,
      // ...(params.topP !== undefined && { top_p: params.topP }),
      ...(system && { system }),
      ...(tools && { tools }),
      ...(tool_choice && { tool_choice }),
    };

    const res = await this.getTransport().postStream('/v1/messages', body, { Accept: 'text/event-stream' }, signal);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Anthropic stream error ${res.status}`);
    }

    const reader = res.body?.getReader();
    if (!reader) return { content: '' };

    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let content = '';
    const toolCalls = new Map<number, ToolCall>();
    let usage: UsageData | undefined;
    let inputTokens = 0;
    let stopReason: string | null = null;

    const processEvent = (eventData: string) => {
      try {
        const event: AnthropicStreamEvent = JSON.parse(eventData);

        if (event.type === 'message_start') {
          if (event.message?.usage) {
            inputTokens = event.message.usage.input_tokens || 0;
          }
        } else if (event.type === 'content_block_start') {
          const block = event.content_block;
          if (block?.type === 'tool_use' && 'id' in block && 'name' in block) {
            toolCalls.set(event.index, {
              id: String(block.id),
              type: 'function',
              function: {
                name: String(block.name) || '',
                arguments: '',
              },
            });
          }
        } else if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            const textDelta = event.delta.text;
            if (textDelta) {
              content += textDelta;
              handlers.onChunk?.(textDelta);
            }
          } else if (event.delta.type === 'input_json_delta') {
            const toolCall = toolCalls.get(event.index);
            if (toolCall) {
              toolCall.function.arguments += event.delta.partial_json;
              handlers.onToolCallDelta?.(toolCall);
            }
          }
        } else if (event.type === 'message_delta') {
          if (event.delta.stop_reason) {
            stopReason = event.delta.stop_reason;
          }
          if (event.usage) {
            usage = {
              prompt_tokens: inputTokens,
              completion_tokens: event.usage.output_tokens,
              total_tokens: inputTokens + event.usage.output_tokens,
            };
          }
        } else if (event.type === 'message_stop') {
          if (handlers.onStreamFinish) {
            handlers.onStreamFinish(stopReason || undefined, usage);
          }
        }
      } catch (err) {}
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data && data !== '[DONE]') {
            processEvent(data);
          }
        }
      }
    }

    if (buffer.trim()) {
      const line = buffer.trim();
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data && data !== '[DONE]') {
          processEvent(data);
        }
      }
    }

    const tool_calls = toolCalls.size > 0 ? Array.from(toolCalls.values()) : undefined;

    return {
      content,
      ...(tool_calls && { tool_calls }),
      ...(usage && { usage }),
    };
  }
}
