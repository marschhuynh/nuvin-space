import {
  PersistingConsoleEventPort,
  InMemoryMemory,
  type AgentEvent,
  type ToolCall,
  type ToolExecutionResult,
} from '@nuvin/nuvin-core';
import {
  processAgentEvent,
  type EventProcessorCallbacks,
  type EventProcessorState,
  resetEventProcessorState,
  type SubAgentState,
} from '@/utils/eventProcessor.js';
import { eventBus } from '@/services/EventBus.js';

export type SessionDisplayMetrics = {
  totalTokens: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalCachedTokens: number;
  requestCount: number;
  toolCallCount: number;
  totalTimeMs: number;
  totalPrice: number;

  currentWindowTokens: number;
  currentWindowPromptTokens: number;
  currentWindowCompletionTokens: number;
  currentWindowCachedTokens: number;
  currentWindowToolCalls: number;
  currentWindowTimeMs: number;
  currentWindowPrice: number;
};

export const createEmptySessionMetrics = (): SessionDisplayMetrics => ({
  totalTokens: 0,
  totalPromptTokens: 0,
  totalCompletionTokens: 0,
  totalCachedTokens: 0,
  requestCount: 0,
  toolCallCount: 0,
  totalTimeMs: 0,
  totalPrice: 0,
  currentWindowTokens: 0,
  currentWindowPromptTokens: 0,
  currentWindowCompletionTokens: 0,
  currentWindowCachedTokens: 0,
  currentWindowToolCalls: 0,
  currentWindowTimeMs: 0,
  currentWindowPrice: 0,
});

export type RequestMetricsUpdate = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cachedTokens?: number;
  responseTimeMs?: number;
  cost?: number;
};

export const updateSessionMetricsForRequest = (
  prev: SessionDisplayMetrics,
  update: RequestMetricsUpdate,
): SessionDisplayMetrics => ({
  totalTokens: prev.totalTokens + (update.totalTokens ?? 0),
  totalPromptTokens: prev.totalPromptTokens + (update.promptTokens ?? 0),
  totalCompletionTokens: prev.totalCompletionTokens + (update.completionTokens ?? 0),
  totalCachedTokens: prev.totalCachedTokens + (update.cachedTokens ?? 0),
  requestCount: prev.requestCount + 1,
  toolCallCount: prev.toolCallCount + prev.currentWindowToolCalls,
  totalTimeMs: prev.totalTimeMs + (update.responseTimeMs ?? 0),
  totalPrice: prev.totalPrice + (update.cost ?? 0),
  currentWindowTokens: update.totalTokens ?? 0,
  currentWindowPromptTokens: update.promptTokens ?? 0,
  currentWindowCompletionTokens: update.completionTokens ?? 0,
  currentWindowCachedTokens: update.cachedTokens ?? 0,
  currentWindowToolCalls: 0,
  currentWindowTimeMs: update.responseTimeMs ?? 0,
  currentWindowPrice: update.cost ?? 0,
});

export const incrementToolCall = (prev: SessionDisplayMetrics): SessionDisplayMetrics => ({
  ...prev,
  currentWindowToolCalls: prev.currentWindowToolCalls + 1,
});

export type MessageMetadata = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  responseTime?: number;
  toolCalls?: number;
  estimatedCost?: number | null;
  cost?: number;
  cachedTokens?: number;
};

export type LineMetadata = {
  timestamp?: string;
  toolName?: string;
  status?: 'success' | 'error';
  duration?: number;
  toolCallCount?: number;
  toolCalls?: ToolCall[];
  toolResult?: ToolExecutionResult;
  toolCall?: ToolCall;
  toolResultsByCallId?: Map<string, MessageLine>;
  isStreaming?: boolean;
  subAgentState?: SubAgentState;
} & Partial<Record<`subAgentState_${string}`, SubAgentState>>;

export type MessageLine = {
  id: string;
  type: 'user' | 'assistant' | 'tool' | 'tool_result' | 'system' | 'error' | 'warning' | 'info' | 'thinking';
  content: string;
  metadata?: LineMetadata;
  color?: string;
};

export class UIEventAdapter extends PersistingConsoleEventPort {
  private state: EventProcessorState = resetEventProcessorState();
  private streamingEnabled: boolean;

  constructor(
    private appendLine: (line: MessageLine) => void,
    private updateLine: (id: string, content: string) => void,
    private updateLineMetadata: (id: string, metadata: Partial<LineMetadata>) => void,
    private setLastMetadata: (metadata: MessageMetadata | null) => void,
    opts?: { filename?: string; streamingEnabled?: boolean },
  ) {
    super(opts?.filename ? { filename: opts.filename } : { memory: new InMemoryMemory<AgentEvent>() });
    this.streamingEnabled = opts?.streamingEnabled ?? false;
  }

  async emit(event: AgentEvent): Promise<void> {
    super.emit(event);

    const callbacks: EventProcessorCallbacks = {
      appendLine: this.appendLine,
      updateLine: this.updateLine,
      updateLineMetadata: this.updateLineMetadata,
      setLastMetadata: this.setLastMetadata,
      streamingEnabled: this.streamingEnabled,
      onToolApprovalRequired: (event) => {
        eventBus.emit('ui:toolApprovalRequired', event);
      },
      onToolResult: () => {
        eventBus.emit('ui:toolResult', {});
      },
      onRequestComplete: (metadata) => {
        eventBus.emit('ui:requestComplete', metadata);
      },
    };

    const result = processAgentEvent(event, this.state, callbacks);
    if (result instanceof Promise) {
      this.state = await result;
    } else {
      this.state = result;
    }
  }

  setStreamingEnabled(enabled: boolean) {
    this.streamingEnabled = enabled;
  }
}
