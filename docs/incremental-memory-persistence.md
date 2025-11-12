# Incremental Memory Persistence Refactoring Plan

## Problem Statement

Current implementation saves all messages at the end of the conversation turn (orchestrator.ts:589). If the application crashes during:
- LLM streaming
- Tool execution
- Network errors
- Signal abort

All messages in that turn are lost, including:
- User input
- Partial assistant responses
- Completed tool results

## Current Implementation

### Single Save Point (Line 589)
```typescript
await this.deps.memory.append(convo, newHistory);
```

**What gets saved:**
1. User message(s)
2. All tool interactions (assistant messages with tool_calls + tool results)
3. Final assistant response

**Risk:** Everything is lost if crash occurs before this line.

### Error Recovery (Lines 603-616)
Only saves partial content when error is caught, but crashes/kills bypass this entirely.

---

## Proposed Solution: Incremental Saves

### Strategy
Save messages incrementally as they complete, treating each message as an atomic unit. Only save complete assistant+tool_calls+tool_results together to maintain consistency.

### Save Points

#### 1. **User Message** (After line 345)
**When:** Immediately after user message is created (non-retry only)
**What to save:**
```typescript
const userMsg: Message = {
  id: this.deps.ids.uuid(),
  role: 'user',
  content: userContent,
  timestamp: userTimestamp
};
await this.deps.memory.append(convo, [userMsg]);
```
**Why:** User input should never be lost, even if LLM fails immediately.
**Note:** No event emission needed - memory persistence is the source of truth.

---

#### 2. **Assistant Message with Tool Calls + Tool Results** (After line 501)
**When:** After ALL tool results for a tool call batch are received
**What to save:**
```typescript
// Assistant message with tool_calls
const assistantMsg: Message = {
  id: this.deps.ids.uuid(),
  role: 'assistant',
  content: result.content ?? null,
  timestamp: this.deps.clock.iso(),
  tool_calls: approvedCalls,
};

// Tool result messages
const toolResultMsgs: Message[] = toolResults.map(tr => ({
  id: tr.id,
  role: 'tool',
  content: contentStr,
  timestamp: this.deps.clock.iso(),
  tool_call_id: tr.id,
  name: tr.name,
}));

// Save as atomic unit
await this.deps.memory.append(convo, [assistantMsg, ...toolResultMsgs]);
```
**Why:**
- Tool calls and results form a logical unit
- Prevents orphaned tool_calls without results
- Crash during next LLM call won't lose completed work

---

#### 3. **Final Assistant Response** (After streaming finishes or non-streaming completes)

##### 3a. Streaming Mode (onStreamFinish callback, line 402-410)
**When:** StreamFinish event fires
**What to save:**
```typescript
onStreamFinish: async (finishReason?: string, usage?: UsageData) => {
  // Emit finish event
  const finishEvent: StreamFinishEvent = { ... };
  await this.deps.events?.emit(finishEvent);

  // Save streamed content immediately
  if (streamedAssistantContent.trim()) {
    const assistantMsg: Message = {
      id: msgId,
      role: 'assistant',
      content: streamedAssistantContent,
      timestamp: this.deps.clock.iso(),
    };
    await this.deps.memory.append(convo, [assistantMsg]);
    await this.deps.events?.emit({
      type: AgentEventTypes.MemoryAppended,
      conversationId: convo,
      delta: [assistantMsg]
    });
  }
}
```

##### 3b. Non-Streaming Mode (After line 416 and 536)
**When:** generateCompletion() returns
**What to save:**
```typescript
result = await this.deps.llm.generateCompletion(params, opts.signal);

// If no tool calls, save final response immediately
if (!result.tool_calls?.length && result.content) {
  const assistantMsg: Message = {
    id: msgId,
    role: 'assistant',
    content: result.content,
    timestamp: this.deps.clock.iso(),
  };
  await this.deps.memory.append(convo, [assistantMsg]);
}
```

---

#### 4. **Tool Denial Case** (Line 266 in handleToolDenial)
**When:** Tools are denied by user
**What's already saved:** Assistant message with tool_calls + denial results
**Action:** Already handled correctly by handleToolDenial - no change needed

---

### What to Remove

#### Remove batch save at end (Line 589-590)
```typescript
// DELETE THESE LINES
await this.deps.memory.append(convo, newHistory);
await this.deps.events?.emit({ type: AgentEventTypes.MemoryAppended, conversationId: convo, delta: newHistory });
```

#### Simplify error handler (Lines 603-616)
Only needed for partial streamed content that hasn't been saved yet:
```typescript
catch (err) {
  try {
    // Only save if streaming was interrupted and content wasn't saved yet
    const partialAssistant = (streamedAssistantContent || '').trim();
    if (partialAssistant && opts.stream) {
      // Check if already saved by looking for msgId in history
      const history = await this.deps.memory.get(convo);
      const alreadySaved = history.some(m => m.id === msgId);

      if (!alreadySaved) {
        const partial: Message = {
          id: msgId,
          role: 'assistant',
          content: partialAssistant,
          timestamp: this.deps.clock.iso(),
        };
        await this.deps.memory.append(convo, [partial]);
        await this.deps.events?.emit({
          type: AgentEventTypes.MemoryAppended,
          conversationId: convo,
          delta: [partial]
        });
      }
    }
  } catch {
    // ignore partial persistence errors
  }
  throw err;
}
```

---

## Implementation Changes

### File: `packages/nuvin-core/orchestrator.ts`

#### Change 1: Save user message immediately (after line 345)
```typescript
// After: userMessages = [{ id: this.deps.ids.uuid(), role: 'user', content: userContent, timestamp: userTimestamp }];
if (!opts.retry && userMessages.length > 0) {
  await this.deps.memory.append(convo, userMessages);
}
```

#### Change 2: Save tool interactions immediately (replace lines 471-501)
```typescript
// After tool execution completes
const assistantMsg: Message = {
  id: this.deps.ids.uuid(),
  role: 'assistant',
  content: result.content ?? null,
  timestamp: this.deps.clock.iso(),
  tool_calls: approvedCalls,
};

const toolResultMsgs: Message[] = [];
for (const tr of toolResults) {
  const contentStr =
    tr.status === 'error'
      ? String(tr.result)
      : typeof tr.result === 'string'
        ? tr.result
        : JSON.stringify(tr.result);

  toolResultMsgs.push({
    id: tr.id,
    role: 'tool',
    content: contentStr,
    timestamp: this.deps.clock.iso(),
    tool_call_id: tr.id,
    name: tr.name,
  });

  await this.deps.events?.emit({
    type: AgentEventTypes.ToolResult,
    conversationId: convo,
    messageId: msgId,
    result: tr,
  });
}

// Save assistant + tool results together
await this.deps.memory.append(convo, [assistantMsg, ...toolResultMsgs]);

// Keep for provider context in next iteration
accumulatedMessages.push({ role: 'assistant', content: result.content ?? null, tool_calls: approvedCalls });
for (const tr of toolResults) {
  const contentStr = /* same as above */;
  accumulatedMessages.push({ role: 'tool', content: contentStr, tool_call_id: tr.id, name: tr.name });
}
```

#### Change 3: Save final response in streaming callback (modify line 402-410)
```typescript
onStreamFinish: async (finishReason?: string, usage?: UsageData) => {
  const finishEvent: StreamFinishEvent = {
    type: AgentEventTypes.StreamFinish,
    conversationId: convo,
    messageId: msgId,
    ...(finishReason && { finishReason }),
    ...(usage && { usage }),
  };
  await this.deps.events?.emit(finishEvent);

  // Save streamed content if no tool calls
  if (!result.tool_calls?.length && streamedAssistantContent.trim()) {
    const assistantMsg: Message = {
      id: msgId,
      role: 'assistant',
      content: streamedAssistantContent,
      timestamp: this.deps.clock.iso(),
    };
    await this.deps.memory.append(convo, [assistantMsg]);
  }
}
```

#### Change 4: Save final response in non-streaming mode (after lines 416, 536)
```typescript
} else {
  result = await this.deps.llm.generateCompletion(params, opts.signal);

  // Save immediately if no tool calls
  if (!result.tool_calls?.length && result.content) {
    const assistantMsg: Message = {
      id: msgId,
      role: 'assistant',
      content: result.content,
      timestamp: this.deps.clock.iso(),
    };
    await this.deps.memory.append(convo, [assistantMsg]);
  }
}
```

#### Change 5: Remove batch save (delete lines 543-590)
```typescript
// DELETE: const newHistory: Message[] = [];
// DELETE: for (const m of userMessages) newHistory.push(m);
// DELETE: for (const m of turnHistory) newHistory.push(m);
// DELETE: if (!toolApprovalDenied) { newHistory.push({ ... }); }
// DELETE: await this.deps.memory.append(convo, newHistory);
```

#### Change 6: Simplify error handler (replace lines 601-616)
```typescript
} catch (err) {
  // Only save partial streamed content if not already persisted
  if (opts.stream && streamedAssistantContent.trim()) {
    try {
      const history = await this.deps.memory.get(convo);
      const alreadySaved = history.some(m => m.id === msgId);

      if (!alreadySaved) {
        const partial: Message = {
          id: msgId,
          role: 'assistant',
          content: streamedAssistantContent,
          timestamp: this.deps.clock.iso(),
        };
        await this.deps.memory.append(convo, [partial]);
      }
    } catch {
      // ignore partial persistence errors
    }
  }
  throw err;
}
```

---

## Benefits

1. **Crash Resilience:** User messages never lost
2. **Atomic Tool Operations:** Tool calls + results saved together
3. **Streaming Safety:** Content saved as soon as streaming completes
4. **Better UX:** Progress persists even during failures
5. **Cleaner Code:** Removes large batch at end, simpler error handling

---

## Testing Checklist

- [ ] User message saved immediately after creation
- [ ] Tool calls + results saved together after execution
- [ ] Final assistant response saved after streaming completes
- [ ] Final assistant response saved in non-streaming mode
- [ ] No duplicate saves when crash occurs
- [ ] Error handler only saves unsaved streamed content
- [ ] Tool denial case still works correctly
- [ ] Retry mode doesn't duplicate user messages
- [ ] Signal abort during tool execution preserves completed work

---