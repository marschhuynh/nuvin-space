# Session Metrics Implementation Plan

## Overview

Add comprehensive metadata tracking for conversation sessions, including:
- **Total tokens**: Cumulative tokens across all requests
- **Current window tokens**: Tokens in the most recent LLM request
- **Request count**: Number of LLM API calls made
- **Tool call count**: Total tool invocations
- **Total time**: Cumulative response time (ms)
- **Total price**: Cumulative estimated cost

---

## 1. Data Contract

### 1.1 Core Types (nuvin-core)

```typescript
// packages/nuvin-core/session-metrics.ts

export type SessionMetrics = {
  // Cumulative metrics (across all requests in session)
  totalTokens: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  requestCount: number;
  toolCallCount: number;
  totalTimeMs: number;
  totalPrice: number;

  // Current window metrics (last request only)
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
```

### 1.2 Extended ConversationMetadata

```typescript
// Update packages/nuvin-core/conversation-store.ts

export type ConversationMetadata = {
  // Existing fields
  topic?: string;
  createdAt?: string;
  updatedAt?: string;
  messageCount?: number;
  
  // Existing token fields (keep for backward compat)
  totalTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  contextWindow?: TokenUsage;
  
  // NEW: Extended metrics
  requestCount?: number;
  toolCallCount?: number;
  totalTimeMs?: number;
  totalPrice?: number;
};
```

### 1.3 UI Layer Types

```typescript
// packages/nuvin-cli/source/adapters/ui-event-adapter.tsx

export type MessageMetadata = {
  // Existing per-request fields
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  responseTime?: number;
  toolCalls?: number;
  estimatedCost?: number | null;
  cost?: number;
  cachedTokens?: number;
};

// NEW: Session-level metadata for Footer component
export type SessionDisplayMetrics = {
  totalTokens: number;
  currentWindowTokens: number;
  requestCount: number;
  toolCallCount: number;
  totalTimeMs: number;
  totalPrice: number;
};
```

---

## 2. Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LLM Provider                                    │
│                                                                              │
│  Returns: UsageData { prompt_tokens, completion_tokens, total_tokens, cost } │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AgentOrchestrator.send()                          │
│                                                                              │
│  1. Tracks tool calls during execution                                       │
│  2. Measures response time (t1 - t0)                                        │
│  3. Collects usage from CompletionResult                                    │
│  4. Emits AgentEventTypes.Done with usage + responseTimeMs                  │
│  5. Returns MessageResponse with metadata                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                          ┌───────────┴───────────┐
                          ▼                       ▼
┌──────────────────────────────────┐  ┌──────────────────────────────────────┐
│       EventPort.emit()           │  │     MessageResponse returned         │
│                                  │  │                                      │
│  AgentEvent (Done) contains:     │  │  metadata: {                         │
│  - responseTimeMs                │  │    promptTokens, completionTokens,   │
│  - usage (prompt/completion/     │  │    totalTokens, estimatedCost,       │
│    total tokens, cost)           │  │    responseTime, toolCalls           │
│                                  │  │  }                                   │
└──────────────────────────────────┘  └──────────────────────────────────────┘
                │                                       │
                ▼                                       ▼
┌──────────────────────────────────┐  ┌──────────────────────────────────────┐
│       UIEventAdapter             │  │     OrchestratorManager.send()       │
│                                  │  │                                      │
│  processAgentEvent():            │  │  updateConversationMetadataAfterSend │
│  - Updates state.metadata        │  │  - Calls ConversationStore methods   │
│  - Calls setLastMetadata()       │  │  - Persists cumulative metrics       │
└──────────────────────────────────┘  └──────────────────────────────────────┘
                │                                       │
                ▼                                       ▼
┌──────────────────────────────────┐  ┌──────────────────────────────────────┐
│         App.tsx State            │  │        ConversationStore             │
│                                  │  │                                      │
│  lastMetadata (per-request)      │  │  Persists to MetadataPort:           │
│  accumulatedCost (cumulative)    │  │  - requestCount++                    │
│                                  │  │  - toolCallCount += N                │
│  NEW:                            │  │  - totalTimeMs += responseTime       │
│  sessionMetrics (cumulative)     │  │  - totalPrice += cost                │
└──────────────────────────────────┘  └──────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────┐
│         Footer Component         │
│                                  │
│  Displays:                       │
│  - Current window tokens         │
│  - Total tokens (cumulative)     │
│  - Request count                 │
│  - Total cost                    │
└──────────────────────────────────┘
```

---

## 3. Implementation Details

### 3.1 SessionMetricsTracker Class (nuvin-core)

```typescript
// packages/nuvin-core/session-metrics.ts

export class SessionMetricsTracker {
  private metrics: Map<string, SessionMetrics> = new Map();

  private getOrCreate(conversationId: string): SessionMetrics {
    if (!this.metrics.has(conversationId)) {
      this.metrics.set(conversationId, {
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
    }
    return this.metrics.get(conversationId)!;
  }

  record(conversationId: string, update: MetricsUpdate): SessionMetrics {
    const m = this.getOrCreate(conversationId);
    
    // Update current window (overwrite)
    m.currentWindowTokens = update.totalTokens ?? 0;
    m.currentWindowPromptTokens = update.promptTokens ?? 0;
    m.currentWindowCompletionTokens = update.completionTokens ?? 0;
    
    // Update cumulative (add)
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
    return this.metrics.get(conversationId) ?? null;
  }

  reset(conversationId: string): void {
    this.metrics.delete(conversationId);
  }

  clear(): void {
    this.metrics.clear();
  }
}
```

### 3.2 ConversationStore Updates

```typescript
// packages/nuvin-core/conversation-store.ts

// NEW method to replace incrementTokens
async recordRequestMetrics(
  conversationId: string,
  metrics: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    toolCalls?: number;
    responseTimeMs?: number;
    cost?: number;
  }
): Promise<ConversationMetadata> {
  const metadata = await this.metadataMemory.get(conversationId);
  
  const updatedMetadata: ConversationMetadata = {
    ...metadata,
    // Cumulative token tracking
    promptTokens: (metadata?.promptTokens ?? 0) + (metrics.promptTokens ?? 0),
    completionTokens: (metadata?.completionTokens ?? 0) + (metrics.completionTokens ?? 0),
    totalTokens: (metadata?.totalTokens ?? 0) + (metrics.totalTokens ?? 0),
    
    // NEW cumulative metrics
    requestCount: (metadata?.requestCount ?? 0) + 1,
    toolCallCount: (metadata?.toolCallCount ?? 0) + (metrics.toolCalls ?? 0),
    totalTimeMs: (metadata?.totalTimeMs ?? 0) + (metrics.responseTimeMs ?? 0),
    totalPrice: (metadata?.totalPrice ?? 0) + (metrics.cost ?? 0),
    
    // Current window (last request)
    contextWindow: {
      promptTokens: metrics.promptTokens,
      completionTokens: metrics.completionTokens,
      totalTokens: metrics.totalTokens,
    },
    
    updatedAt: new Date().toISOString(),
  };
  
  await this.metadataMemory.set(conversationId, updatedMetadata);
  return updatedMetadata;
}
```

### 3.3 OrchestratorManager Updates

```typescript
// packages/nuvin-cli/source/services/OrchestratorManager.ts

// Update updateConversationMetadataAfterSend
private async updateConversationMetadataAfterSend(
  conversationId: string,
  metrics: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    toolCalls?: number;
    responseTimeMs?: number;
    cost?: number;
  }
): Promise<void> {
  if (!this.conversationStore || !this.memory) {
    return;
  }

  const messages = await this.memory.get(conversationId);
  await this.conversationStore.updateMetadata(conversationId, {
    messageCount: messages.length,
  });

  // Use new recordRequestMetrics instead of incrementTokens
  await this.conversationStore.recordRequestMetrics(conversationId, metrics);
}

// Update send() method to pass all metrics
async send(...) {
  // ... existing code ...
  
  if (result && this.conversationStore) {
    await this.updateConversationMetadataAfterSend(conversationId, {
      promptTokens: result.metadata?.promptTokens,
      completionTokens: result.metadata?.completionTokens,
      totalTokens: result.metadata?.totalTokens,
      toolCalls: result.metadata?.toolCalls,
      responseTimeMs: result.metadata?.responseTime,
      cost: result.metadata?.estimatedCost ?? undefined,
    });
  }
}
```

### 3.4 Event Updates (AgentEventTypes.Done)

The `Done` event already contains what we need:
```typescript
{
  type: AgentEventTypes.Done,
  conversationId: string,
  messageId: string,
  responseTimeMs: number,  // Already exists
  usage?: UsageData,       // Already exists (has cost)
}
```

No changes needed to the event structure.

### 3.5 UI Integration (App.tsx)

```typescript
// packages/nuvin-cli/source/app.tsx

// NEW: Track session metrics
const [sessionMetrics, setSessionMetrics] = useState<SessionDisplayMetrics>({
  totalTokens: 0,
  currentWindowTokens: 0,
  requestCount: 0,
  toolCallCount: 0,
  totalTimeMs: 0,
  totalPrice: 0,
});

// Update handleSetLastMetadata to also update session metrics
const handleSetLastMetadata = useCallback((metadata: MessageMetadata | null) => {
  setLastMetadata(metadata);
  
  if (metadata) {
    setSessionMetrics(prev => ({
      totalTokens: prev.totalTokens + (metadata.totalTokens ?? 0),
      currentWindowTokens: metadata.totalTokens ?? 0,
      requestCount: prev.requestCount + 1,
      toolCallCount: prev.toolCallCount + (metadata.toolCalls ?? 0),
      totalTimeMs: prev.totalTimeMs + (metadata.responseTime ?? 0),
      totalPrice: prev.totalPrice + (metadata.cost ?? 0),
    }));
    
    // Keep existing accumulatedCost for backward compat
    if (metadata.cost && metadata.cost > 0) {
      setAccumulatedCost((prev) => prev + (metadata.cost ?? 0));
    }
  }
}, []);

// Reset session metrics on new conversation
const onNewConversation = async (event) => {
  setSessionMetrics({
    totalTokens: 0,
    currentWindowTokens: 0,
    requestCount: 0,
    toolCallCount: 0,
    totalTimeMs: 0,
    totalPrice: 0,
  });
  // ... existing code
};
```

### 3.6 Footer Component Update

```typescript
// packages/nuvin-cli/source/components/Footer.tsx

type FooterProps = {
  // Existing props
  status: OrchestratorStatus;
  lastMetadata: MessageMetadata | null;
  accumulatedCost: number;
  toolApprovalMode: boolean;
  vimModeEnabled: boolean;
  vimMode: 'insert' | 'normal';
  workingDirectory: string;
  
  // NEW: Session metrics
  sessionMetrics?: SessionDisplayMetrics;
};

// Display in footer
<Text>
  Tokens: {sessionMetrics.currentWindowTokens} / {sessionMetrics.totalTokens} | 
  Requests: {sessionMetrics.requestCount} | 
  Tools: {sessionMetrics.toolCallCount} | 
  Time: {(sessionMetrics.totalTimeMs / 1000).toFixed(1)}s | 
  Cost: ${sessionMetrics.totalPrice.toFixed(4)}
</Text>
```

---

## 4. Where Data Comes From

| Metric | Source | Location |
|--------|--------|----------|
| `promptTokens` | LLM provider response | `CompletionResult.usage.prompt_tokens` |
| `completionTokens` | LLM provider response | `CompletionResult.usage.completion_tokens` |
| `totalTokens` | LLM provider response | `CompletionResult.usage.total_tokens` |
| `cost` | LLM provider response | `CompletionResult.usage.cost` (OpenRouter, etc.) |
| `responseTimeMs` | Orchestrator calculation | `t1 - t0` in `AgentOrchestrator.send()` |
| `toolCalls` | Orchestrator tracking | Count of `allToolResults` in `send()` |
| `requestCount` | Counter increment | +1 per `send()` call |

---

## 5. Files to Modify

| File | Changes |
|------|---------|
| `packages/nuvin-core/session-metrics.ts` | **NEW** - SessionMetrics type + SessionMetricsTracker class |
| `packages/nuvin-core/conversation-store.ts` | Add `requestCount`, `toolCallCount`, `totalTimeMs`, `totalPrice` to metadata; add `recordRequestMetrics()` |
| `packages/nuvin-core/index.ts` | Export `SessionMetrics`, `SessionMetricsTracker` |
| `packages/nuvin-cli/source/services/OrchestratorManager.ts` | Update `updateConversationMetadataAfterSend()` to use new metrics |
| `packages/nuvin-cli/source/app.tsx` | Add `sessionMetrics` state, update `handleSetLastMetadata` |
| `packages/nuvin-cli/source/components/Footer.tsx` | Display session metrics |
| `packages/nuvin-cli/source/adapters/ui-event-adapter.tsx` | Add `SessionDisplayMetrics` type |

---

## 6. Testing Plan

### Unit Tests (nuvin-core)
```typescript
// packages/nuvin-core/tests/session-metrics.test.ts

describe('SessionMetricsTracker', () => {
  it('should initialize with zero values', () => {});
  it('should record metrics and update cumulative totals', () => {});
  it('should track current window separately from totals', () => {});
  it('should handle multiple conversations independently', () => {});
  it('should reset specific conversation metrics', () => {});
});

// packages/nuvin-core/tests/conversation-store.test.ts
describe('ConversationStore.recordRequestMetrics', () => {
  it('should increment all cumulative metrics', () => {});
  it('should update contextWindow with current request', () => {});
  it('should handle missing/undefined values gracefully', () => {});
});
```

### Integration Tests
```typescript
// packages/nuvin-core/tests/orchestrator-metrics.test.ts

describe('AgentOrchestrator metrics tracking', () => {
  it('should include responseTimeMs in Done event', () => {});
  it('should track tool call count accurately', () => {});
  it('should pass usage data through to events', () => {});
});
```

---

## 7. Migration Notes

- `ConversationStore.incrementTokens()` remains for backward compatibility
- New `recordRequestMetrics()` is the preferred method going forward
- Existing persisted metadata will have `undefined` for new fields
- UI should handle `undefined` gracefully (default to 0)
