import type { RemindersPort } from './ports';

export class NoopReminders implements RemindersPort {
  enhance(content: string, _opts: { conversationId?: string }): string[] {
    return [content];
  }
}

