import type {ToolDefinition} from '../ports';
import type {FunctionTool, ExecResult} from './types';

export class WebFetchTool implements FunctionTool<{url: string}> {
  name = 'web_fetch';
  parameters = {
    type: 'object',
    properties: {
      url: {type: 'string', description: 'URL to fetch'},
    },
    required: ['url'],
  } as const;

  definition(): ToolDefinition['function'] {
    return {
      name: this.name,
      description: 'Fetch raw contents of a web page',
      parameters: this.parameters,
    };
  }

  async execute(params: {url: string}): Promise<ExecResult> {
    const target = String(params.url ?? '');
    try {
      const res = await fetch(target, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
      });
      console.log('Fetched', target, res.status);
      const text = await res.text();
      return {status: 'success', type: 'text', result: text};
    } catch (error: any) {
      return {status: 'error', type: 'text', result: String(error)};
    }
  }
}

