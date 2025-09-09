import type { CompletionParams, CompletionResult, LLMPort, ToolCall } from '../ports';

// A minimal LLM implementation for demos. It can emit tool calls
// based on special prefixes in the last user message:
//  - !reverse <text>
//  - !wc <text>
export class EchoLLM implements LLMPort {
  async generateCompletion(params: CompletionParams): Promise<CompletionResult> {
    const last = [...params.messages].reverse().find((m) => m.role === 'user');
    const content = String(last?.content ?? '');

    const toolCalls: ToolCall[] = [];
    if (content.startsWith('!reverse ') && this.hasTool(params, 'reverse_text')) {
      const text = content.slice('!reverse '.length);
      toolCalls.push({ id: this.id('rev'), type: 'function', function: { name: 'reverse_text', arguments: JSON.stringify({ text }) } });
    } else if (content.startsWith('!wc ') && this.hasTool(params, 'word_count')) {
      const text = content.slice('!wc '.length);
      toolCalls.push({ id: this.id('wc'), type: 'function', function: { name: 'word_count', arguments: JSON.stringify({ text }) } });
    } else if (content.startsWith('!todo ') && this.hasTool(params, 'todo_write')) {
      const payload = content.slice('!todo '.length);
      let todos: any;
      try { todos = JSON.parse(payload); } catch { todos = []; }
      toolCalls.push({ id: this.id('todo'), type: 'function', function: { name: 'todo_write', arguments: JSON.stringify({ todos }) } });
    }

    // If provider sees tool outputs in the context, synthesize a short answer
    const sawTool = params.messages.some((m) => m.role === 'tool');
    if (sawTool) {
      const lastTool = [...params.messages].reverse().find((m) => m.role === 'tool');
      const toolText = typeof lastTool?.content === 'string' ? lastTool.content : '';
      return { content: `Tool result: ${toolText}` };
    }

    if (toolCalls.length > 0) {
      return { content: '', tool_calls: toolCalls };
    }

    // Default echo behaviour
    return { content: `Echo: ${content}` };
  }

  private hasTool(params: CompletionParams, name: string): boolean {
    return !!params.tools?.some((t) => t.function.name === name);
  }

  private id(prefix: string): string {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
  }
}
