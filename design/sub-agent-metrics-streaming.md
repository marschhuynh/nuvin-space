# Sub-Agent Metrics Streaming Implementation Plan

## Problem Statement

Currently, sub-agent metrics (tool calls, tokens, cost) are only returned in the final `assign_task` tool result. The UI cannot display real-time metrics during sub-agent execution. Users have no visibility into:
- Running cost accumulation
- Token usage as it happens
- LLM call count progression

## Goals

1. Stream sub-agent metrics to UI in real-time via event system
2. Aggregate sub-agent costs into parent session metrics
3. Display live metrics in `SubAgentActivity` component
4. Maintain backward compatibility with existing event structure

## Design

### 1. New Event Type: `SubAgentMetrics`

Add a new event type to stream metrics updates during sub-agent execution.

```typescript
// packages/nuvin-core/src/ports.ts

AgentEventTypes = {
  // ... existing
  SubAgentMetrics: 'sub_agent_metrics',  // NEW
}

// New event shape
| {
    type: typeof AgentEventTypes.SubAgentMetrics;
    conversationId: string;
    messageId: string;
    agentId: string;
    toolCallId: string;  // Links to assign_task tool call
    metrics: {
      llmCallCount: number;
      toolCallCount: number;
      tokensUsed: number;
      promptTokens: number;
      completionTokens: number;
      cachedTokens: number;
      reasoningTokens: number;
      estimatedCost: number;
      elapsedMs: number;
    };
  }
```

### 2. Enhance `SubAgentCompleted` Event

Add final metrics summary to completion event.

```typescript
| {
    type: typeof AgentEventTypes.SubAgentCompleted;
    conversationId: string;
    messageId: string;
    agentId: string;
    agentName: string;
    status: 'success' | 'error' | 'timeout';
    resultMessage: string;
    totalDurationMs: number;
    // NEW: Final metrics
    finalMetrics: {
      llmCallCount: number;
      toolCallCount: number;
      totalTokens: number;
      promptTokens: number;
      completionTokens: number;
      cachedTokens: number;
      reasoningTokens: number;
      totalCost: number;
    };
  }
```

### 3. Core Changes

#### 3.1 AgentManager Metrics Collection

File: `packages/nuvin-core/src/agent-manager.ts`

```typescript
// Add metrics accumulator
private metricsAccumulator = new Map<string, {
  llmCallCount: number;
  toolCallCount: number;
  tokensUsed: number;
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
  estimatedCost: number;
}>();

// In executeTask(), create metrics port that:
// 1. Accumulates metrics locally
// 2. Emits SubAgentMetrics event on each update
const metricsPort = this.createSubAgentMetricsPort(config, startTime);

// Pass to specialist orchestrator
const specialistOrchestrator = new AgentOrchestrator(specialistConfig, {
  // ... existing deps
  metrics: metricsPort,  // NEW
});
```

#### 3.2 Sub-Agent Metrics Port Factory

```typescript
// New method in AgentManager
private createSubAgentMetricsPort(
  config: SpecialistAgentConfig,
  startTime: number
): MetricsPort {
  const agentId = config.agentId;
  const accumulated = {
    llmCallCount: 0,
    toolCallCount: 0,
    tokensUsed: 0,
    promptTokens: 0,
    completionTokens: 0,
    cachedTokens: 0,
    reasoningTokens: 0,
    estimatedCost: 0,
  };

  this.metricsAccumulator.set(agentId, accumulated);

  return {
    recordLLMCall: (usage: UsageData, cost?: number) => {
      accumulated.llmCallCount += 1;
      accumulated.tokensUsed += usage.total_tokens ?? 0;
      accumulated.promptTokens += usage.prompt_tokens ?? 0;
      accumulated.completionTokens += usage.completion_tokens ?? 0;
      accumulated.cachedTokens += usage.prompt_tokens_details?.cached_tokens ?? 0;
      accumulated.reasoningTokens += usage.reasoning_tokens ?? 0;
      accumulated.estimatedCost += cost ?? usage.cost ?? 0;

      // Emit metrics event
      this.eventCallback?.({
        type: AgentEventTypes.SubAgentMetrics,
        conversationId: config.conversationId ?? 'default',
        messageId: config.messageId ?? '',
        agentId: config.agentId,
        toolCallId: config.toolCallId ?? '',
        metrics: {
          ...accumulated,
          elapsedMs: Date.now() - startTime,
        },
      });
    },
    recordToolCall: () => {
      accumulated.toolCallCount += 1;
      // Emit on tool call too
      this.eventCallback?.({
        type: AgentEventTypes.SubAgentMetrics,
        conversationId: config.conversationId ?? 'default',
        messageId: config.messageId ?? '',
        agentId: config.agentId,
        toolCallId: config.toolCallId ?? '',
        metrics: {
          ...accumulated,
          elapsedMs: Date.now() - startTime,
        },
      });
    },
    recordRequestComplete: () => {},
    setContextWindow: () => {},
    reset: () => {},
    getSnapshot: () => ({ ...accumulated } as MetricsSnapshot),
  };
}
```

#### 3.3 Update SubAgentCompleted Emission

```typescript
// In executeTask() success path
const finalMetrics = this.metricsAccumulator.get(agentId);

this.eventCallback?.({
  type: AgentEventTypes.SubAgentCompleted,
  conversationId: config.conversationId ?? 'default',
  messageId: config.messageId ?? '',
  agentId: config.agentId,
  agentName: config.agentName,
  status: 'success',
  resultMessage: response.content || '',
  totalDurationMs: executionTimeMs,
  finalMetrics: finalMetrics ? {
    llmCallCount: finalMetrics.llmCallCount,
    toolCallCount: finalMetrics.toolCallCount,
    totalTokens: finalMetrics.tokensUsed,
    promptTokens: finalMetrics.promptTokens,
    completionTokens: finalMetrics.completionTokens,
    cachedTokens: finalMetrics.cachedTokens,
    reasoningTokens: finalMetrics.reasoningTokens,
    totalCost: finalMetrics.estimatedCost,
  } : undefined,
});
```

### 4. CLI Changes

#### 4.1 Event Processor State

File: `packages/nuvin-cli/source/utils/eventProcessor.ts`

```typescript
// Extend SubAgentState
export type SubAgentState = {
  // ... existing fields

  // NEW: Live metrics
  metrics?: {
    llmCallCount: number;
    toolCallCount: number;
    tokensUsed: number;
    promptTokens: number;
    completionTokens: number;
    cachedTokens: number;
    reasoningTokens: number;
    estimatedCost: number;
    elapsedMs: number;
  };

  // NEW: Final metrics (set on completion)
  finalMetrics?: {
    llmCallCount: number;
    toolCallCount: number;
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    cachedTokens: number;
    reasoningTokens: number;
    totalCost: number;
  };
};
```

#### 4.2 Handle SubAgentMetrics Event

```typescript
case AgentEventTypes.SubAgentMetrics: {
  const subAgent = state.subAgents.get(event.agentId);
  if (!subAgent) return state;

  // Update live metrics
  subAgent.metrics = event.metrics;

  // Update UI
  if (subAgent.toolCallMessageId && subAgent.toolCallId) {
    callbacks.updateLineMetadata?.(subAgent.toolCallMessageId, {
      [`subAgentState_${subAgent.toolCallId}`]: subAgent,
    });
  }

  return state;
}
```

#### 4.3 Update SubAgentCompleted Handler

```typescript
case AgentEventTypes.SubAgentCompleted: {
  const subAgent = state.subAgents.get(event.agentId);
  if (!subAgent) return state;

  subAgent.status = 'completed';
  subAgent.finalStatus = event.status;
  subAgent.resultMessage = event.resultMessage;
  subAgent.totalDurationMs = event.totalDurationMs;
  subAgent.finalMetrics = event.finalMetrics;  // NEW

  // ... rest unchanged
}
```

#### 4.4 SubAgentActivity Component

File: `packages/nuvin-cli/source/components/ToolResultView/SubAgentActivity.tsx`

```tsx
// Add metrics display section
const metrics = subAgentState.metrics || subAgentState.finalMetrics;

// In render, after tool calls list:
{metrics && (
  <Box flexDirection="row" marginLeft={2} marginTop={1}>
    <Text dimColor>
      {`Tokens: ${metrics.tokensUsed || metrics.totalTokens || 0}`}
      {` | LLM calls: ${metrics.llmCallCount}`}
      {` | Tools: ${metrics.toolCallCount}`}
      {metrics.estimatedCost || metrics.totalCost ?
        ` | Cost: $${((metrics.estimatedCost || metrics.totalCost) / 100).toFixed(4)}` : ''}
    </Text>
  </Box>
)}
```

### 5. Session Metrics Aggregation

#### 5.1 Aggregate Sub-Agent Cost to Parent Session

File: `packages/nuvin-cli/source/services/OrchestratorManager.ts`

In the event handler, when `SubAgentCompleted` is received:

```typescript
case AgentEventTypes.SubAgentCompleted: {
  // Aggregate sub-agent metrics to session
  if (event.finalMetrics) {
    sessionMetricsService.recordLLMCall(this.sessionId, {
      total_tokens: event.finalMetrics.totalTokens,
      prompt_tokens: event.finalMetrics.promptTokens,
      completion_tokens: event.finalMetrics.completionTokens,
      prompt_tokens_details: {
        cached_tokens: event.finalMetrics.cachedTokens,
      },
      reasoning_tokens: event.finalMetrics.reasoningTokens,
    }, event.finalMetrics.totalCost);
  }
  break;
}
```

### 6. Implementation Tasks

| # | Task | File(s) | Priority |
|---|------|---------|----------|
| 1 | Add `SubAgentMetrics` event type | `ports.ts` | High |
| 2 | Add `finalMetrics` to `SubAgentCompleted` | `ports.ts` | High |
| 3 | Create metrics port factory in AgentManager | `agent-manager.ts` | High |
| 4 | Wire metrics port to specialist orchestrator | `agent-manager.ts` | High |
| 5 | Emit `SubAgentMetrics` on LLM/tool calls | `agent-manager.ts` | High |
| 6 | Include `finalMetrics` in completion event | `agent-manager.ts` | High |
| 7 | Extend `SubAgentState` type | `eventProcessor.ts` | Medium |
| 8 | Handle `SubAgentMetrics` event | `eventProcessor.ts` | Medium |
| 9 | Update `SubAgentCompleted` handler | `eventProcessor.ts` | Medium |
| 10 | Display live metrics in UI | `SubAgentActivity.tsx` | Medium |
| 11 | Aggregate to parent session metrics | `OrchestratorManager.ts` | Medium |
| 12 | Add unit tests for metrics streaming | `tests/` | Low |
| 13 | Update types in `SubAgentActivity.tsx` | `SubAgentActivity.tsx` | Low |

### 7. Testing Strategy

1. **Unit Tests**
   - `agent-manager.test.ts`: Verify metrics port emits events
   - `eventProcessor.test.ts`: Verify state updates on metrics events

2. **Integration Tests**
   - Run sub-agent and verify metrics events are emitted
   - Verify final metrics match accumulated values
   - Verify session metrics include sub-agent costs

3. **Manual Testing**
   - Trigger `assign_task` and observe live metrics in UI
   - Verify cost display updates in real-time
   - Verify session total includes sub-agent costs

### 8. Backward Compatibility

- `finalMetrics` on `SubAgentCompleted` is optional
- CLI handles missing metrics gracefully (already has fallbacks)
- No breaking changes to existing event handlers

### 9. Future Enhancements

- Add metrics breakdown by sub-agent in session summary
- Support nested sub-agent metrics (depth > 1)
- Add metrics history/timeline visualization
- Export sub-agent metrics to conversation store
