export type SessionMetrics = {
  totalTokens: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  requestCount: number;
  toolCallCount: number;
  totalTimeMs: number;
  totalPrice: number;

  currentWindowTokens: number;
  currentWindowPromptTokens: number;
  currentWindowCompletionTokens: number;
};

export type MetricsUpdate = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  toolCalls?: number;
  responseTimeMs?: number;
  cost?: number;
};

const createEmptyMetrics = (): SessionMetrics => ({
  totalTokens: 0,
  totalPromptTokens: 0,
  totalCompletionTokens: 0,
  requestCount: 0,
  toolCallCount: 0,
  totalTimeMs: 0,
  totalPrice: 0,
  currentWindowTokens: 0,
  currentWindowPromptTokens: 0,
  currentWindowCompletionTokens: 0,
});

export class SessionMetricsTracker {
  private metrics: Map<string, SessionMetrics> = new Map();

  private getOrCreate(conversationId: string): SessionMetrics {
    if (!this.metrics.has(conversationId)) {
      this.metrics.set(conversationId, createEmptyMetrics());
    }
    return this.metrics.get(conversationId)!;
  }

  record(conversationId: string, update: MetricsUpdate): SessionMetrics {
    const m = this.getOrCreate(conversationId);

    m.currentWindowTokens = update.totalTokens ?? 0;
    m.currentWindowPromptTokens = update.promptTokens ?? 0;
    m.currentWindowCompletionTokens = update.completionTokens ?? 0;

    m.totalTokens += update.totalTokens ?? 0;
    m.totalPromptTokens += update.promptTokens ?? 0;
    m.totalCompletionTokens += update.completionTokens ?? 0;
    m.requestCount += 1;
    m.toolCallCount += update.toolCalls ?? 0;
    m.totalTimeMs += update.responseTimeMs ?? 0;
    m.totalPrice += update.cost ?? 0;

    return { ...m };
  }

  get(conversationId: string): SessionMetrics | null {
    const m = this.metrics.get(conversationId);
    return m ? { ...m } : null;
  }

  reset(conversationId: string): void {
    this.metrics.delete(conversationId);
  }

  clear(): void {
    this.metrics.clear();
  }
}
