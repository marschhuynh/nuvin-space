# Session Metrics Flow Diagram

## High-Level Flow

```
User Input "hi"
    ↓
App.tsx: processMessage()
    ↓
OrchestratorManager.send()
    ↓
AgentOrchestrator.send()
    ├─ LLM Call #1 (streaming)
    ├─ Emit StreamFinish event with usage
    ├─ [if tool_calls] Execute tools
    ├─ Increment tool count per ToolResult event
    ├─ LLM Call #2 (with tool results)
    ├─ Emit StreamFinish event with usage
    └─ Emit Done event
    ↓
UIEventAdapter.emit() - processes all events
    ↓
eventBus.emit('ui:requestComplete') - fires on StreamFinish
    ↓
App.tsx: handleRequestComplete()
    ↓
setSessionMetrics() - updates cumulative state
    ↓
Footer component re-renders with new metrics
```

---

## Detailed Event Timeline

### Scenario: User says "hi" → Agent responds with tool call → Execute tool → Agent gives final response

```
Time  Event                          Emitted By              Handled By              Action
────  ─────────────────────────────  ──────────────────────  ──────────────────────  ────────────────────────────
t0    MessageStarted                 Orchestrator            UIEventAdapter          [UI shows "waiting..."]
                                                             (ignored for metrics)

t1    AssistantChunk: "Hi, I ca..."  Orchestrator            EventProcessor          [streaming text display]
      (streaming deltas)                                     (no metric impact)

t2    StreamFinish                   Orchestrator            EventProcessor          onRequestComplete()
      - finishReason: "tool_calls"                           ↓
      - usage: {prompt: 60, ...}                             eventBus.emit('ui:requestComplete', metadata)
                                                             ↓
                                                             App.handleRequestComplete()
                                                             ↓
                                                             setSessionMetrics(prev → updateSessionMetricsForRequest)
                                                             ✓ requestCount: 0 → 1
                                                             ✓ totalTokens: 0 → 150
                                                             ✓ totalPrice: 0 → $0.002
                                                             ✓ currentWindowTokens: 150

t3    ToolCalls                      Orchestrator            EventProcessor          [UI shows tool call list]
      - toolCalls: [read_file...]    (ignored for metrics)

t4    ToolResult #1                  ExecuteToolCalls        EventProcessor          onToolResult()
      - status: success                                      ↓
      - durationMs: 45                                       eventBus.emit('ui:toolResult')
                                                             ↓
                                                             App.handleToolResult()
                                                             ↓
                                                             setSessionMetrics(prev → incrementToolCall)
                                                             ✓ toolCallCount: 0 → 1
                                                             ✓ currentWindowToolCalls: 0 → 1

t5    AssistantChunk: "Found..."    Orchestrator            EventProcessor          [streaming text display]
      (second request, with tool       (streaming loop)
       results submitted)

t6    StreamFinish                   Orchestrator            EventProcessor          onRequestComplete()
      - finishReason: "stop"                                 ↓
      - usage: {prompt: 210, ...}                            eventBus.emit('ui:requestComplete', metadata)
                                                             ↓
                                                             App.handleRequestComplete()
                                                             ↓
                                                             setSessionMetrics(prev → updateSessionMetricsForRequest)
                                                             ✓ requestCount: 1 → 2
                                                             ✓ totalTokens: 150 → 360
                                                             ✓ toolCallCount: 1 → (1+1) = 2*
                                                             ✓ totalPrice: $0.002 → $0.005
                                                             ✓ currentWindowTokens: 210

t7    Done                           Orchestrator            EventProcessor          [final event, no extra count]
      - responseTimeMs: 2500                                 (only onRequestComplete on StreamFinish)
      - usage: {prompt: 210, ...}
```

*Note: toolCallCount accumulation happens via `updateSessionMetricsForRequest()` which adds `prev.currentWindowToolCalls` to cumulative total

---

## State Management in App.tsx

### Initial State
```typescript
sessionMetrics = {
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
}
```

### Update on ToolResult (t4)
```typescript
setSessionMetrics(prev => incrementToolCall(prev))
// Returns:
{
  ...prev,
  currentWindowToolCalls: prev.currentWindowToolCalls + 1  // 0 → 1
}
```

### Update on RequestComplete (t2)
```typescript
setSessionMetrics(prev => updateSessionMetricsForRequest(prev, {
  promptTokens: 60,
  completionTokens: 90,
  totalTokens: 150,
  responseTimeMs: 1200,
  cost: 0.002,
}))

// Returns:
{
  // Cumulative (add to previous)
  totalTokens: 0 + 150 = 150,
  totalPromptTokens: 0 + 60 = 60,
  totalCompletionTokens: 0 + 90 = 90,
  totalCachedTokens: 0 + 0 = 0,
  requestCount: 0 + 1 = 1,
  toolCallCount: 0 + 0 = 0,  // Add current window tools
  totalTimeMs: 0 + 1200 = 1200,
  totalPrice: 0 + 0.002 = 0.002,
  
  // Current Window (overwite with current request)
  currentWindowTokens: 150,
  currentWindowPromptTokens: 60,
  currentWindowCompletionTokens: 90,
  currentWindowCachedTokens: 0,
  currentWindowToolCalls: 0,  // Reset after accumulation
  currentWindowTimeMs: 1200,
  currentWindowPrice: 0.002,
}
```

### Update on RequestComplete (t6)
```typescript
setSessionMetrics(prev => updateSessionMetricsForRequest(prev, {
  promptTokens: 150,
  completionTokens: 60,
  totalTokens: 210,
  responseTimeMs: 1300,
  cost: 0.003,
}))

// Returns:
{
  // Cumulative (add to previous)
  totalTokens: 150 + 210 = 360,
  totalPromptTokens: 60 + 150 = 210,
  totalCompletionTokens: 90 + 60 = 150,
  totalCachedTokens: 0 + 0 = 0,
  requestCount: 1 + 1 = 2,
  toolCallCount: 0 + 1 = 1,  // Add current window tools (from previous request)
  totalTimeMs: 1200 + 1300 = 2500,
  totalPrice: 0.002 + 0.003 = 0.005,
  
  // Current Window (overwrite with current request)
  currentWindowTokens: 210,
  currentWindowPromptTokens: 150,
  currentWindowCompletionTokens: 60,
  currentWindowCachedTokens: 0,
  currentWindowToolCalls: 0,  // Reset after accumulation
  currentWindowTimeMs: 1300,
  currentWindowPrice: 0.003,
}
```

---

## Event Flow Chart

```
┌─────────────────────────────────────────────────────────────┐
│ AgentOrchestrator (nuvin-core)                              │
│ - Measures response time (t1 - t0)                          │
│ - Tracks tool call count during execution                   │
│ - Emits events with usage data                              │
└──────────────────┬──────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┬──────────────┐
        ↓                     ↓              ↓
    StreamFinish          ToolCalls       Done
    event                 event           event
  (has usage)           (ignored for     (ignored
                        metrics in      for metrics
                        streaming)      in streaming)
        │                   │              │
        └───────────────────┼──────────────┘
                            ↓
        ┌───────────────────────────────────┐
        │ UIEventAdapter                    │
        │ - processAgentEvent()             │
        │ - Extracts metadata from events   │
        │ - Calls callbacks                 │
        └───────┬───────────────────────────┘
                │
    ┌───────────┼───────────┐
    ↓           ↓           ↓
onToolResult  onRequestComplete  onToolApprovalRequired
    │           │
    └───┐   ┌───┘
        │   │
        ↓   ↓
    eventBus.emit()
        │   │
        ├───┼─────────────────────────────┐
        │   │                             │
        ↓   ↓                             ↓
  'ui:toolResult'  'ui:requestComplete'  'ui:toolApprovalRequired'
        │                   │
        └───────────────┬───┘
                        ↓
        ┌───────────────────────────────┐
        │ App.tsx Event Listeners       │
        │ - handleToolResult()          │
        │ - handleRequestComplete()     │
        └───────┬─────────────────────┬─┘
                │                     │
                ↓                     ↓
        incrementToolCall()  updateSessionMetricsForRequest()
                │                     │
                └──────────┬──────────┘
                           ↓
                  setSessionMetrics()
                  (React state update)
                           │
                           ↓
        ┌──────────────────────────────┐
        │ Footer Component             │
        │ - Re-renders with new metrics│
        │ - Displays:                  │
        │   Tokens: 210 / 360          │
        │   Req: 2                     │
        │   Tools: 1                   │
        │   $0.005                     │
        └──────────────────────────────┘
```

---

## Key Design Decisions

### 1. **Count Tools on ToolResult, Not ToolCalls**
- **Why**: ToolCalls event fires before execution; ToolResult fires after
- **Result**: Accurate tool count only increments for completed tool executions
- **Flow**: ToolCalls → Execute → ToolResult (increment here)

### 2. **Count Requests on StreamFinish, Not Done**
- **Why**: Multiple StreamFinish events in tool loops (one per LLM round-trip)
- **Example**: 
  - Request 1: "call tool" → StreamFinish (Req: 1)
  - Execute tool
  - Request 2: "here's result" → StreamFinish (Req: 2)
  - Done event (no additional count)
- **Result**: Accurate request count for each LLM call including tool result submissions

### 3. **Separate Per-Request and Cumulative Tracking**
- **currentWindow* fields**: Latest request data (for footer display)
- **total* fields**: Cumulative sum across entire session
- **Why**: Footer shows both current AND cumulative for context

### 4. **Cost Mapping (estimated_cost → cost)**
- **Problem**: Providers like MiniMax use `estimated_cost` instead of `cost`
- **Solution**: normalizeUsage() maps `estimated_cost` → `cost` field
- **Location**: llm-providers/llm-utils.ts

---

## Persistence to ConversationStore

After each `handleRequestComplete()`, metrics are also persisted:

```typescript
// OrchestratorManager.updateConversationMetadataAfterSend()
await this.conversationStore.recordRequestMetrics(conversationId, {
  promptTokens: result.metadata?.promptTokens,
  completionTokens: result.metadata?.completionTokens,
  totalTokens: result.metadata?.totalTokens,
  toolCalls: result.metadata?.toolCalls,
  responseTimeMs: result.metadata?.responseTime,
  cost: result.metadata?.estimatedCost,
})

// ConversationStore.recordRequestMetrics() updates:
// - promptTokens, completionTokens, totalTokens (cumulative)
// - requestCount++
// - toolCallCount += N
// - totalTimeMs += ms
// - totalPrice += cost
// - contextWindow (current request)
```

This allows metrics to persist across sessions when using `memPersist: true`.

---

## Footer Display

```
┌──────────────────────────────────────────────────────────────────┐
│ Tokens: 210 / 360 (↑150 ↓60) | Req: 2 | Tools: 1 | $0.005        │
│         ↑       ↑             ↑       ↑        ↑         ↑        │
│    current  total     breakdown  count   count    total   │
│    window  session    of current  of     of       session │
│    tokens  tokens     window      LLM    tool     cost    │
│                                   calls  execs            │
└──────────────────────────────────────────────────────────────────┘
```

All values come from `sessionMetrics` state:
- `210` = `sessionMetrics.currentWindowTokens`
- `360` = `sessionMetrics.totalTokens`
- `↑150` = `sessionMetrics.currentWindowPromptTokens`
- `↓60` = `sessionMetrics.currentWindowCompletionTokens`
- `2` = `sessionMetrics.requestCount`
- `1` = `sessionMetrics.toolCallCount + sessionMetrics.currentWindowToolCalls`
- `$0.005` = `sessionMetrics.totalPrice`
