import type { ToolDefinition } from '../ports';
import type { FunctionTool, ExecResult } from './types';

export class ReverseTextTool implements FunctionTool {
  name = 'reverse_text';
  parameters = {
    type: 'object',
    properties: { text: { type: 'string', description: 'Text to reverse' } },
    required: ['text'],
  } as const;

  definition(): ToolDefinition['function'] {
    return {
      name: this.name,
      description: 'Reverse a given text string',
      parameters: this.parameters,
    };
  }

  execute(params: Record<string, unknown>): ExecResult {
    const text = String(params.text ?? '');
    return { status: 'success', type: 'text', result: text.split('').reverse().join('') };
  }
}

