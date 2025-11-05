import TurndownService from 'turndown';
import type { ToolDefinition } from '../ports.js';
import type { FunctionTool, ExecResult, ToolExecutionContext } from './types.js';

export class WebFetchTool implements FunctionTool<{ url: string }, ToolExecutionContext> {
  name = 'web_fetch';
  parameters = {
    type: 'object',
    properties: {
      description: {
        type: 'string',
        description:
          'Explanation of what web page is being fetched and why (e.g., "Fetch documentation page for API usage examples")',
      },
      url: { type: 'string', description: 'Fetch and convert this web page URL to Markdown' },
    },
    required: ['url'],
  } as const;

  private turndownService: TurndownService;

  constructor() {
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
    });

    this.turndownService.remove(['script', 'style', 'noscript', 'iframe', 'nav', 'footer', 'header', 'aside']);
  }

  definition(): ToolDefinition['function'] {
    return {
      name: this.name,
      description: 'Fetch web page content and convert to Markdown format',
      parameters: this.parameters,
    };
  }

  async execute(params: { url: string }, ctx?: ToolExecutionContext): Promise<ExecResult> {
    const target = String(params.url ?? '');

    if (!target) {
      return { status: 'error', type: 'text', result: 'URL parameter is required' };
    }

    if (ctx?.signal?.aborted) {
      return { status: 'error', type: 'text', result: 'Fetch aborted by user' };
    }

    try {
      const res = await fetch(target, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
        signal: ctx?.signal,
      });

      if (!res.ok) {
        return {
          status: 'error',
          type: 'text',
          result: `HTTP ${res.status} ${res.statusText}`,
        };
      }

      const contentType = res.headers.get('content-type') || '';
      const text = await res.text();

      if (contentType.includes('application/json')) {
        const markdown = `\`\`\`json\n${text}\n\`\`\``;
        return { status: 'success', type: 'text', result: markdown };
      } else if (contentType.includes('text/html')) {
        const markdown = this.turndownService.turndown(text);
        return { status: 'success', type: 'text', result: markdown };
      } else {
        return { status: 'success', type: 'text', result: text };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isAborted = errorMessage.includes('aborted') || (error as Error).name === 'AbortError';
      return {
        status: 'error',
        type: 'text',
        result: isAborted ? 'Fetch aborted by user' : errorMessage,
      };
    }
  }
}
