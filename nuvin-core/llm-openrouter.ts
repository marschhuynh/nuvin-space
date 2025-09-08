import type { CompletionParams, CompletionResult, LLMPort, ToolCall, UsageData } from './ports';
import type { HttpTransport } from './transport';

type OpenRouterChatResponse = {
  id?: string;
  model?: string;
  choices?: Array<{
    index?: number;
    message?: {
      role?: string;
      content?: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason?: string | null;
  }>;
  usage?: UsageData;
};

type CompletionBody = Omit<CompletionParams, 'maxTokens' | 'topP'> & {
  max_tokens?: number;
  top_p?: number;
  stream: boolean;
};

export class OpenRouterLLM implements LLMPort {
  constructor(
    private transport: HttpTransport,
    private apiKey: string,
    private apiUrl = 'https://openrouter.ai/api/v1',
  ) {}

  async generateCompletion(params: CompletionParams, signal?: AbortSignal): Promise<CompletionResult> {
    const body: CompletionBody = {
      model: params.model,
      messages: params.messages,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
      top_p: params.topP,
      stream: false,
    };

    if (params.tools && params.tools.length > 0) body.tools = params.tools;
    if (params.tool_choice && params.tools && params.tools.length > 0) body.tool_choice = params.tool_choice;

    const res = await this.transport.postJson(
      `${this.apiUrl}/chat/completions`,
      body,
      {
        Authorization: `Bearer ${this.apiKey}`,
      },
      signal,
    );

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 401) {
        throw new Error(`OpenRouter unauthorized (401). Provide a valid OPENROUTER_API_KEY. Response: ${text}`);
      }
      if (res.status === 403) {
        throw new Error(`OpenRouter access denied (403). Check key and account. Response: ${text}`);
      }
      throw new Error(`OpenRouter error ${res.status}: ${text}`);
    }

    const data = (await res.json()) as OpenRouterChatResponse;
    const contentParts: string[] = [];
    const mergedToolCalls: ToolCall[] = [];
    for (const ch of data.choices || []) {
      const msg = ch.message;
      if (msg?.content?.trim?.()) contentParts.push(msg.content);
      if (Array.isArray(msg?.tool_calls)) mergedToolCalls.push(...msg.tool_calls);
    }
    const content = contentParts.join('\n\n');
    const tool_calls = mergedToolCalls.length ? mergedToolCalls : undefined;

    const usage: UsageData | undefined = data.usage;

    return { content, ...(tool_calls ? { tool_calls } : {}), ...(usage ? { usage } : {}) };
  }
}

