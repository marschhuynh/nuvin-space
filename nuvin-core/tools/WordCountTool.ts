import type { ToolDefinition } from '../ports';
import type { FunctionTool, ExecResult } from './types';

export class WordCountTool implements FunctionTool {
  name = 'word_count';
  parameters = {
    type: 'object',
    properties: { text: { type: 'string', description: 'Text to count words' } },
    required: ['text'],
  } as const;

  definition(): ToolDefinition['function'] {
    return {
      name: this.name,
      description: 'Count words in a text string',
      parameters: this.parameters,
    };
  }

  execute(params: Record<string, unknown>): ExecResult {
    const text = String(params.text ?? '');
    const count = text.trim() ? text.trim().split(/\s+/).length : 0;
    return { status: 'success', type: 'json', result: { count } };
  }
}

