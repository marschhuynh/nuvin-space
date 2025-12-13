# Recent Code Changes - Architectural Improvement Plan

> Generated: 2024-12-13  
> Scope: Last 10 commits only (b1e1d8a → 49b6608)

## Files Analyzed

| File | Commit | Issue Priority |
|------|--------|----------------|
| `source/utils/staticCount.ts` | b1e1d8a | Medium |
| `source/utils/get.ts` | Recent | Low |
| `source/utils/formatters.ts` | b360cc3 | Low |
| `source/components/ToolResultView/ToolResultView.tsx` | Recent | High |
| `source/utils/retry-utils.ts` | 6f5ad8d | Medium |
| `source/adapters/ui-event-adapter.tsx` | e250cb3 | Medium |

---

## 1. ToolResultView.tsx - High Priority

### Current Issues

**1.1 Long Switch Statement in `getStatusMessage()` (Lines 77-195)**
- 120+ lines of switch-case logic
- Violates Open/Closed Principle
- Hard to maintain and test individually

**1.2 Duplicated Status Message Pattern**
```typescript
// Repeated pattern 10+ times:
return { text: '...', color: statusColor, paramText };
```

### Recommended Changes

**Apply Strategy Pattern:**

```typescript
// Create: source/components/ToolResultView/statusStrategies.ts
interface StatusStrategy {
  getStatus(result: ToolExecutionResult, params: StatusParams): StatusMessage;
}

const strategies: Record<string, StatusStrategy> = {
  file_edit: new FileEditStatusStrategy(),
  file_read: new FileReadStatusStrategy(),
  bash_tool: new BashToolStatusStrategy(),
  // ...
};

export function getStatusMessage(toolResult: ToolExecutionResult, params: StatusParams): StatusMessage {
  const strategy = strategies[toolResult.name] ?? defaultStrategy;
  return strategy.getStatus(toolResult, params);
}
```

**Extract Error Status Logic (Lines 77-115):**
```typescript
// Create: source/components/ToolResultView/errorStatusMap.ts
const errorStatusMap: Record<ErrorReason, { text: string; colorKey: 'warning' | 'error' }> = {
  [ErrorReason.Aborted]: { text: 'Aborted', colorKey: 'warning' },
  [ErrorReason.Denied]: { text: 'Denied', colorKey: 'warning' },
  [ErrorReason.Timeout]: { text: 'Timeout', colorKey: 'warning' },
  // ...
};

function getErrorStatus(errorReason: ErrorReason, theme: Theme): StatusMessage | null {
  const config = errorStatusMap[errorReason];
  if (!config) return null;
  return {
    text: config.text,
    color: theme.colors[config.colorKey] || (config.colorKey === 'warning' ? 'yellow' : 'red'),
  };
}
```

### Implementation Steps

1. Create `source/components/ToolResultView/statusStrategies/` directory
2. Extract each tool's status logic to separate strategy file
3. Create `StatusStrategyRegistry` for tool registration
4. Refactor `getStatusMessage()` to use registry
5. Add unit tests for each strategy

---

## 2. staticCount.ts - Medium Priority

### Current Issue

**Potential O(n²) in Nested Loop (Lines 27-45)**
```typescript
for (let i = msgs.length - 1; i >= 0; i--) {
  // ...
  if (msg.metadata?.isStreaming === true && isLastNonTransientMessage(msgs, i)) {
    // isLastNonTransientMessage iterates from i+1 to end
  }
}
```

For each message, `isLastNonTransientMessage` may iterate remaining messages → O(n²) worst case.

### Recommended Changes

**Precompute Last Non-Transient Index:**
```typescript
export function calculateStaticCount(msgs: MessageLine[]): number {
  // Precompute last non-transient index - O(n)
  let lastNonTransientIndex = -1;
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].metadata?.isTransient !== true) {
      lastNonTransientIndex = i;
      break;
    }
  }

  let dynamicCount = 0;
  for (let i = msgs.length - 1; i >= 0; i--) {
    const msg = msgs[i];
    if (msg.metadata?.isTransient === true) continue;

    // O(1) check instead of O(n)
    const isLast = i === lastNonTransientIndex;
    
    if (msg.metadata?.isStreaming === true && isLast) {
      dynamicCount = msgs.length - i;
      break;
    }
    
    if (hasAnyPendingToolCalls(msg)) {
      dynamicCount = msgs.length - i;
      break;
    }
  }

  return Math.max(0, msgs.length - dynamicCount);
}
```

**Complexity Improvement:** O(n²) → O(n)

### Implementation Steps

1. Add performance benchmark test
2. Implement optimized version
3. Verify behavior with existing tests
4. Update tests to cover edge cases

---

## 3. get.ts Utility - Low Priority

### Current Issue

**Custom Implementation vs Established Library**
- Lodash `get()` is battle-tested with edge cases
- Current implementation lacks:
  - Array index notation: `path[0].name`
  - Null prototype objects
  - Symbol keys

### Evaluation Needed

```typescript
// Current usage in codebase
get(toolResult, 'metadata.bytesWritten')
get(toolResult, 'metadata.stats')
get(toolResult, 'result.count')
```

### Options

| Option | Pros | Cons |
|--------|------|------|
| Keep custom | Zero dependencies, type-safe | Missing edge cases |
| Use lodash.get | Battle-tested, full features | +4KB bundle, less type-safe |
| Enhance custom | Best of both | Maintenance burden |

### Recommendation

**Keep current implementation** if:
- Only simple dot-notation paths used
- No array indexing needed
- Type safety is priority

**Switch to lodash.get** if:
- Complex paths needed in future
- Bundle size not critical

---

## 4. retry-utils.ts - Medium Priority

### Current Issue

**Deprecated Module Still Exists**
- Marked as `@deprecated` but still in codebase
- Potential confusion for developers
- `error-classification.ts` import creates tight coupling

### Recommended Changes

**Option A: Remove Module**
```bash
# If no imports exist
rm source/utils/retry-utils.ts
```

**Option B: Re-export from Core**
```typescript
// source/utils/retry-utils.ts
export { 
  AbortError, 
  RetryTransport, 
  type RetryConfig 
} from '@nuvin/nuvin-core';

/** @deprecated Use imports from @nuvin/nuvin-core directly */
export const withRetry = null; // Force compile error on usage
```

### Implementation Steps

1. Search for `retry-utils` imports in codebase
2. Update all imports to use `@nuvin/nuvin-core`
3. Remove or re-export module
4. Update documentation

---

## 5. ui-event-adapter.tsx - Medium Priority

### Current Issue

**State Management Coupling (Lines 58-73)**
```typescript
async emit(event: AgentEvent): Promise<void> {
  super.emit(event);
  const result = processAgentEvent(event, this.state, callbacks);
  if (result instanceof Promise) {
    this.state = await result;
  } else {
    this.state = result;
  }
}
```

- Mixed sync/async handling is confusing
- State mutation happens in callback
- No error boundary for event processing

### Recommended Changes

**Add Error Boundary:**
```typescript
async emit(event: AgentEvent): Promise<void> {
  try {
    await super.emit(event);
    this.state = await this.processEventSafely(event);
  } catch (error) {
    console.error('[UIEventAdapter] Event processing failed:', error);
    eventBus.emit('ui:error', { source: 'event-adapter', error });
  }
}

private async processEventSafely(event: AgentEvent): Promise<EventProcessorState> {
  const result = processAgentEvent(event, this.state, this.callbacks);
  return result instanceof Promise ? await result : result;
}
```

**Extract Callbacks to Class Property:**
```typescript
private get callbacks(): EventProcessorCallbacks {
  return {
    appendLine: this.appendLine,
    updateLine: this.updateLine,
    updateLineMetadata: this.updateLineMetadata,
    streamingEnabled: this.streamingEnabled,
    onToolApprovalRequired: (event) => eventBus.emit('ui:toolApprovalRequired', event),
  };
}
```

---

## 6. formatters.ts - Low Priority (Good Quality)

### Observations

✅ Well-structured centralized module  
✅ Good JSDoc comments  
✅ Proper null/undefined handling  
✅ Consistent naming conventions

### Minor Improvements

**Add Input Validation:**
```typescript
export const formatTokens = (tokens: number | null | undefined): string => {
  if (tokens == null || !Number.isFinite(tokens) || tokens < 0) return '-';
  // ...
};
```

**Consider Memoization for `getGitBranch`:**
```typescript
const gitBranchCache = new Map<string, { value: string | null; timestamp: number }>();
const CACHE_TTL = 5000; // 5 seconds

export const getGitBranch = (dir: string): string | null => {
  const cached = gitBranchCache.get(dir);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.value;
  }
  // ... existing logic
  gitBranchCache.set(dir, { value: result, timestamp: Date.now() });
  return result;
};
```

---

## Implementation Priority Matrix

| Task | Priority | Effort | Impact |
|------|----------|--------|--------|
| ToolResultView Strategy Pattern | High | 4h | High - Maintainability |
| staticCount.ts Optimization | Medium | 1h | Medium - Performance |
| retry-utils.ts Cleanup | Medium | 30m | Medium - Code Hygiene |
| ui-event-adapter Error Boundary | Medium | 1h | Medium - Reliability |
| get.ts Evaluation | Low | 30m | Low - Decision Only |
| formatters.ts Memoization | Low | 30m | Low - Minor Perf |

---

## Testing Requirements

### New Tests Needed

1. **ToolResultView Strategies**
   - Unit test each strategy independently
   - Integration test for strategy registry

2. **staticCount Optimization**
   - Performance benchmark test
   - Edge cases: empty array, all transient, all streaming

3. **ui-event-adapter**
   - Error handling during event processing
   - State consistency after errors

### Existing Test Coverage

- ✅ `tests/staticCount.test.ts` - Covers basic cases
- ✅ `tests/get.test.ts` - Covers type safety
- ⚠️ `tests/eventProcessor.test.ts` - May need error case additions

---

## Next Steps

1. [ ] Review and approve this plan
2. [ ] Create branch: `refactor/recent-changes-improvements`
3. [ ] Implement High Priority items first
4. [ ] Run existing tests after each change
5. [ ] Add new tests as specified
6. [ ] Code review and merge
