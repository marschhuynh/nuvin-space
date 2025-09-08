import type { AgentEvent, EventPort } from './ports';
import type { MemoryPort } from './ports';
import { PersistedMemory, JsonFileMemoryPersistence } from './memory';

export class NoopEventPort implements EventPort {
  emit(_event: AgentEvent): void {}
}

export class CallbackEventPort implements EventPort {
  constructor(private handler: (event: AgentEvent) => void | Promise<void>) {}
  emit(event: AgentEvent): void | Promise<void> {
    return this.handler(event);
  }
}

export class ConsoleEventPort implements EventPort {
  emit(event: AgentEvent): void {
    try {
      // Keep logs compact but useful
      switch (event.type) {
        case 'message_started':
          console.log('[agent] start', {
            convo: event.conversationId,
            id: event.messageId,
            tools: event.toolNames,
            content: event.userContent,
          });
          break;
        case 'tool_calls':
          console.log('[agent] tool_calls', event.toolCalls);
          break;
        case 'tool_result':
          console.log('[agent] tool_result', event.result);
          break;
        case 'assistant_message':
          console.log('[agent] assistant', event.content);
          break;
        case 'memory_appended':
          console.log('[agent] memory+ =', event.delta.length);
          break;
        case 'done':
          console.log('[agent] done', { ms: event.responseTimeMs, usage: event.usage });
          break;
        case 'error':
          console.warn('[agent] error', event.error);
          break;
      }
    } catch {
      // ignore logging errors
    }
  }
}

export class PersistingConsoleEventPort implements EventPort {
  // private console = new ConsoleEventPort();
  private memory: MemoryPort<AgentEvent>;
  private maxPerConversation: number;

  constructor(opts?: { memory?: MemoryPort<AgentEvent>; filename?: string; maxPerConversation?: number }) {
    this.memory =
      opts?.memory ?? new PersistedMemory<AgentEvent>(new JsonFileMemoryPersistence<AgentEvent>(opts?.filename || '.nuvin_events.json'));
    this.maxPerConversation = opts?.maxPerConversation ?? 500;
  }

  async emit(event: AgentEvent): Promise<void> {
    // Always log to console
    // this.console.emit(event);
    // Persist per conversation
    try {
      const key = event.conversationId || 'default';
      const existing = await this.memory.get(key);
      const next = [...existing, { ...event }];
      // Truncate to last N
      const max = this.maxPerConversation;
      const trimmed = max > 0 && next.length > max ? next.slice(next.length - max) : next;
      await this.memory.set(key, trimmed);
    } catch {
      // ignore persistence errors
    }
  }
}
