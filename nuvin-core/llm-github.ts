import type { CompletionParams, CompletionResult, LLMPort, ToolCall, UsageData } from './ports';
import type { HttpTransport } from './transport';

type GitHubChatCompletionResponse = {
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
  usage?: UsageData & { input_tokens?: number; output_tokens?: number };
};

type CompletionBody = Omit<CompletionParams, 'maxTokens' | 'topP'> & {
  max_tokens?: number;
  top_p?: number;
  stream: boolean;
};

export class GithubLLM implements LLMPort {
  private apiUrl: string;

  constructor(
    private transport: HttpTransport,
    apiUrl = 'https://api.githubcopilot.com',
  ) {
    this.apiUrl = apiUrl;
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

    if (params.tools && params.tools.length > 0) body.tools = params.tools;
    if (params.tool_choice && params.tools && params.tools.length > 0) body.tool_choice = params.tool_choice;

    const res = await this.transport.postJson(
      `${this.apiUrl}/chat/completions`,
      body,
      {
        'editor-version': 'vscode/1.100.3',
        'editor-plugin-version': 'GitHub.copilot/1.330.0',
        'user-agent': 'GithubCopilot/1.330.0',
      },
      signal,
    );

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 401) {
        throw new Error(
          `GitHub Copilot unauthorized (401). Ensure transport handles Authorization and refresh. Response: ${text}`,
        );
      }
      if (res.status === 403) {
        throw new Error(
          `GitHub Copilot access denied (403). Ensure active Copilot subscription and correct token. Response: ${text}`,
        );
      }
      throw new Error(`GitHub Copilot error ${res.status}: ${text}`);
    }

    const data = (await res.json()) as GitHubChatCompletionResponse;
    // Merge multiple choices: collect content strings and tool calls from any choice
    const contentParts: string[] = [];
    const mergedToolCalls: ToolCall[] = [];
    for (const ch of data.choices || []) {
      const msg = ch.message;
      if (!msg) continue;
      if (typeof msg.content === 'string' && msg.content.trim()) contentParts.push(msg.content);
      if (Array.isArray(msg.tool_calls)) mergedToolCalls.push(...msg.tool_calls);
    }
    const content = contentParts.join('\n\n');
    const tool_calls = mergedToolCalls.length ? mergedToolCalls : undefined;

    let usage: UsageData | undefined;
    if (data.usage) {
      usage = {
        prompt_tokens: data.usage.prompt_tokens ?? data.usage.input_tokens,
        completion_tokens: data.usage.completion_tokens ?? data.usage.output_tokens,
        total_tokens:
          data.usage.total_tokens ??
          ((data.usage.prompt_tokens ?? data.usage.input_tokens ?? 0) +
            (data.usage.completion_tokens ?? data.usage.output_tokens ?? 0)),
      };
    }

    return { content, ...(tool_calls ? { tool_calls } : {}), ...(usage ? { usage } : {}) };
  }
}
