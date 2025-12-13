# ChatDisplay Re-render Issue Analysis & Fix Plan

## Deep Analysis

### The Core Problem

The `staticItems` logic has a **fundamental flaw in how it detects what's "new"** when `staticCount` increases.

**Current behavior (line 109-111):**
```javascript
if (staticCount > prevStatic.length) {
  const newItems = currentStaticSlice.slice(prevStatic.length);
  return update([...prevStatic, ...newItems]);
}
```

This assumes items at indices `0` to `prevStatic.length - 1` are unchanged. But `currentStaticSlice` comes from `mergedMessages`, which is **rebuilt every render** by `mergeToolCallsWithResults`. The items in `prevStatic` and `currentStaticSlice` may have the same `id` but **different object references**.

### Why This Causes Re-renders

When `staticItemsWithHeader` is passed to Ink's `<Static>`:
1. Ink uses `items.length` change to determine new items to render
2. But React's reconciliation still runs on the children
3. If object references changed, `MessageLine` components may re-render (even with `React.memo`, if props changed)

### The Specific Bug Scenario

1. `messages` = [user, assistant, tool(2 calls), result1]
2. `mergedMessages` = [user, assistant, tool_with_partial_results, result1]
3. `staticCount` = 2 (tool still pending)
4. `staticItems` = [user, assistant]

5. result2 arrives: `messages` = [user, assistant, tool(2 calls), result1, result2]
6. `mergedMessages` = [user, assistant, **tool_with_all_results_NEW_OBJECT**, result1, result2]
7. `staticCount` = 5
8. `staticItems` append: `[...prevStatic, newItems]` where `newItems = [tool_NEW, result1, result2]`

Here `tool_NEW` is correct to add. But the issue is that **every subsequent render**, `mergeToolCallsWithResults` creates new objects for tool messages. If `staticCount` doesn't change, the check at line 139 (`return prevStatic`) saves us. But this relies on length staying the same.

### The Real Issue: `mergeToolCallsWithResults` Creates New Objects Every Time

Even when nothing changed in the source `messages`, calling `mergeToolCallsWithResults` creates new objects for any tool message that has results (line 54-60):

```javascript
if (resultsByCallId.size > 0) {
  result.push({
    ...msg,  // NEW OBJECT every time
    metadata: { ...msg.metadata, toolResultsByCallId: resultsByCallId },
  });
}
```

---

## The Plan

### Option A: Memoize `mergeToolCallsWithResults` with stable object references (Recommended)

Add a cache that preserves object references when the underlying data hasn't changed:

1. Use a `useRef` to store a cache: `Map<messageId, { inputMsg, outputMsg }>`
2. In `mergeToolCallsWithResults`, check if:
   - The input message is the same reference
   - The `toolResultsByCallId` would have the same entries
3. If both true, return the cached output object
4. Otherwise, create new and cache it

**Pros**: Minimal changes, localized fix
**Cons**: Adds complexity to merge function

### Option B: Fix `staticItems` comparison to be content-aware

Instead of relying on object reference stability, compare items by `id` and a content hash:

1. When appending, verify that `prevStatic` items match `currentStaticSlice` items by `id`
2. Use `prevStatic` items (stable references) instead of `currentStaticSlice` items

```javascript
if (staticCount > prevStatic.length) {
  // Verify existing items haven't changed (by id)
  for (let i = 0; i < prevStatic.length; i++) {
    if (prevStatic[i].id !== currentStaticSlice[i]?.id) {
      return update(currentStaticSlice); // Full invalidation
    }
  }
  // Append only truly new items
  const newItems = currentStaticSlice.slice(prevStatic.length);
  return update([...prevStatic, ...newItems]);
}
```

**Pros**: Doesn't change merge function
**Cons**: Doesn't fix the root cause; merged objects still differ

### Option C: Move merge logic inside the component with per-message memoization

Use `useMemo` per message to ensure stable references:

```javascript
const messageCache = useRef(new Map());

const mergedMessages = useMemo(() => {
  // For each message, check cache and reuse if unchanged
}, [messages]);
```

**Pros**: Most robust, full control
**Cons**: More complex implementation

---

## Recommendation

**Go with Option A** - memoize inside `mergeToolCallsWithResults` using a ref-based cache. This fixes the root cause (unstable object references) without changing the rest of the logic.

---

## MessageLine Component Issues

### 1. **`React.memo` is ineffective due to object props**

The component receives `message` as a prop, which contains nested objects (`metadata`, `toolResultsByCallId` Map). `React.memo` does shallow comparison, so even if content is the same, new object references trigger re-renders.

```typescript
// Current: shallow comparison fails when message object reference changes
export const MessageLine = React.memo(MessageLineComponent);
```

### 2. **`useStdoutDimensions` hook may cause re-renders**

Every terminal resize triggers re-render of all MessageLine components. Need to verify if this hook is memoized properly or if it causes cascading re-renders.

### 3. **`useTheme` hook**

If theme context value changes reference (even with same content), all MessageLine components re-render.

### 4. **No custom comparison function for `React.memo`**

For complex props like `message`, a custom `areEqual` function is needed:

```typescript
export const MessageLine = React.memo(MessageLineComponent, (prevProps, nextProps) => {
  // Compare by id and relevant fields, not object reference
  if (prevProps.message.id !== nextProps.message.id) return false;
  if (prevProps.message.content !== nextProps.message.content) return false;
  if (prevProps.message.type !== nextProps.message.type) return false;
  if (prevProps.message.metadata?.isStreaming !== nextProps.message.metadata?.isStreaming) return false;
  if (prevProps.backgroundColor !== nextProps.backgroundColor) return false;
  
  // For tool messages, compare toolResultsByCallId by size and keys
  if (prevProps.message.type === 'tool') {
    const prevMap = prevProps.message.metadata?.toolResultsByCallId as Map<string, unknown> | undefined;
    const nextMap = nextProps.message.metadata?.toolResultsByCallId as Map<string, unknown> | undefined;
    if (prevMap?.size !== nextMap?.size) return false;
    if (prevMap && nextMap) {
      for (const key of prevMap.keys()) {
        if (!nextMap.has(key)) return false;
      }
    }
  }
  
  return true;
});
```

### 5. **`toolResultsByCallId` is a Map**

Maps are always new references when created. Even if contents are identical, `===` comparison fails. This is why the custom comparison above checks Map size and keys instead of reference equality.

### 6. **Inline `renderMessage` function** (minor)

The `renderMessage` function is recreated every render. While not directly causing child re-renders, it adds overhead. Could be optimized with `useMemo` or by extracting to separate components per message type.

---

## Combined Fix Strategy

### Phase 1: Fix `mergeToolCallsWithResults` (Root Cause)
Implement Option A - memoize merged objects to maintain stable references.

### Phase 2: Add Custom Comparison to `MessageLine`
Add `areEqual` function to `React.memo` to prevent re-renders when only object references changed but content is the same.

### Phase 3: Verify Hooks
- Audit `useStdoutDimensions` for proper memoization
- Audit `useTheme` context value stability

---

### Implementation Sketch for Option A

```typescript
type MergeCache = Map<string, { 
  inputRef: MessageLineType;
  resultIds: Set<string>;
  output: MessageLineType;
}>;

function useMergeToolCallsWithResults(messages: MessageLineType[]): MessageLineType[] {
  const cacheRef = useRef<MergeCache>(new Map());
  
  return useMemo(() => {
    const cache = cacheRef.current;
    const result: MessageLineType[] = [];
    const toolResultsById = new Map<string, MessageLineType>();

    // First pass: collect tool results
    for (const msg of messages) {
      if (msg.type === 'tool_result' && msg.metadata?.toolResult?.id) {
        toolResultsById.set(msg.metadata.toolResult.id, msg);
      }
    }

    // Second pass: merge with caching
    for (const msg of messages) {
      if (msg.type === 'tool') {
        const toolCalls = msg.metadata?.toolCalls || [];
        const resultsByCallId = new Map<string, MessageLineType>();
        
        for (const toolCall of toolCalls) {
          const toolResult = toolResultsById.get(toolCall.id);
          if (toolResult) {
            resultsByCallId.set(toolCall.id, toolResult);
          }
        }

        if (resultsByCallId.size > 0) {
          // Check cache
          const cached = cache.get(msg.id);
          const currentResultIds = new Set(resultsByCallId.keys());
          
          if (cached && 
              cached.inputRef === msg && 
              setsEqual(cached.resultIds, currentResultIds)) {
            result.push(cached.output);
          } else {
            const output = {
              ...msg,
              metadata: { ...msg.metadata, toolResultsByCallId: resultsByCallId },
            };
            cache.set(msg.id, { inputRef: msg, resultIds: currentResultIds, output });
            result.push(output);
          }
          
          // Add results after tool
          for (const [, toolResult] of resultsByCallId) {
            result.push(toolResult);
          }
        } else {
          result.push(msg);
        }
      } else if (msg.type === 'tool_result') {
        // Skip if already merged (has matching tool call)
        const toolResultId = msg.metadata?.toolResult?.id;
        if (!toolResultId) {
          result.push(msg);
        } else {
          const hasMatchingToolCall = messages.some(
            (m) => m.type === 'tool' && m.metadata?.toolCalls?.some((tc) => tc.id === toolResultId),
          );
          if (!hasMatchingToolCall) {
            result.push(msg);
          }
        }
      } else {
        result.push(msg);
      }
    }

    // Cleanup stale cache entries
    const currentIds = new Set(messages.map(m => m.id));
    for (const key of cache.keys()) {
      if (!currentIds.has(key)) {
        cache.delete(key);
      }
    }

    return result;
  }, [messages]);
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}
```
