# Issue: --history flag loads UI messages but memory not populated for LLM context

## Summary
When using `--history <path>` CLI flag, conversation history displays correctly in the UI, but the LLM loses context because the memory is not properly populated before the orchestrator initializes.

## Root Cause

**Race condition between history loading and orchestrator initialization**

In `packages/nuvin-cli/source/app.tsx`, the history loading useEffect (lines 150-201) runs immediately on component mount:

```typescript
useEffect(() => {
  if (!historyPath || historyLoadedRef.current) return;

  const loadHistory = async () => {
    // ...
    const result = await loadHistoryFromFile(resolvedPath);
    if (result.kind === 'messages') {
      if (result.cliMessages && result.cliMessages.length > 0) {
        await orchestratorManager.getMemory()?.set('cli', result.cliMessages);  // BUG: memory may be null
      }
      setLines(result.lines);
      // ...
    }
  };
  loadHistory();
}, [historyPath]);
```

**Problem Flow:**
1. Component mounts, both useEffects run
2. `loadHistory` useEffect calls `orchestratorManager.getMemory()` 
3. `orchestratorManager.memory` is `null` because orchestrator init is async and hasn't completed
4. The optional chaining `?.set()` silently does nothing when memory is null
5. Orchestrator finishes initializing with **fresh, empty memory**
6. UI shows history (via `setLines`), but LLM memory is empty
7. User sends new message → orchestrator reads empty history → LLM has no context

## Affected Code

- `packages/nuvin-cli/source/app.tsx`: lines 150-201 (loadHistory effect)
- `packages/nuvin-cli/source/services/OrchestratorManager.ts`: `getMemory()` returns null before init

## Evidence

1. `OrchestratorManager.memory` is initially `null` (line ~60: `private memory: MemoryPort<Message> | null = null`)
2. Memory is only set after async init completes (line 399: `this.memory = memory`)
3. The orchestrator's `send()` method reads history via `this.memory.get(convo)` (orchestrator.ts:391)
4. No dependency on `status` in the loadHistory useEffect to wait for READY state

## Fix Required

Wait for orchestrator to be ready before loading history into memory:

1. Add `status` as a dependency to the loadHistory useEffect
2. Only call `orchestratorManager.getMemory()?.set()` when `status === OrchestratorStatus.READY`
3. Or alternatively, use a ref to track when orchestrator is ready and defer history loading
