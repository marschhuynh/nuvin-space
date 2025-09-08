import type { ChatMessage, ContextBuilder, Message } from './ports';

// Simple context builder: system + transformed history + new user messages
export class SimpleContextBuilder implements ContextBuilder {
  toProviderMessages(history: Message[], systemPrompt: string, newUserContent: string[]): ChatMessage[] {
    const transformed: ChatMessage[] = [];

    for (const m of history) {
      if (m.role === 'user') {
        transformed.push({ role: 'user', content: m.content ?? '' });
      } else if (m.role === 'assistant') {
        if (m.tool_calls && m.tool_calls.length > 0) {
          transformed.push({ role: 'assistant', content: m.content ?? null, tool_calls: m.tool_calls });
        } else {
          transformed.push({ role: 'assistant', content: m.content ?? '' });
        }
      } else if (m.role === 'tool') {
        // Only include valid tool messages that reference a specific assistant tool_call
        if (m.tool_call_id) {
          transformed.push({ role: 'tool', content: m.content ?? '', tool_call_id: m.tool_call_id, name: m.name });
        }
      }
    }

    const userMsgs: ChatMessage[] = newUserContent.map((c) => ({ role: 'user', content: c }));

    return [{ role: 'system', content: systemPrompt }, ...transformed, ...userMsgs];
  }
}
