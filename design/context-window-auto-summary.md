# Feature Plan: Context Window Overflow Detection & Auto-Summary

## Problem

When conversation exceeds a model's context window limit, the LLM API returns an error (typically 400/413 with messages like `context_length_exceeded`, `max_tokens`, `too many tokens`). Currently, the app just fails.

## Architecture Overview

### Key Components Identified

| Component | Location | Role |
|-----------|----------|------|
| `BaseLLM` / `GenericLLM` | `nuvin-core/llm-providers/` | Makes LLM calls, throws `LLMError` |
| `LLMError` | `base-llm.ts:6` | Error with `statusCode`, `isRetryable` |
| `AgentOrchestrator` | `nuvin-core/orchestrator.ts` | Main send loop, catches errors |
| `OrchestratorManager` | `nuvin-cli/source/services/` | CLI wrapper, has `summarize()` method |
| `/summary` command | `commands/definitions/summary/` | Manual summarization (LLM-based + beta compression) |
| `ConversationStore` | `nuvin-core/conversation-store.ts` | Tracks `contextWindow` token usage |

---

## Proposed Implementation

### 1. Model Context Window Registry (nuvin-core)

```typescript
// New file: nuvin-core/llm-providers/model-limits.ts
type ModelLimits = {
  contextWindow: number;  // max input tokens
  maxOutput?: number;     // max output tokens
};

// Map of provider -> model -> limits
const MODEL_LIMITS: Record<string, Record<string, ModelLimits>> = {
  openrouter: {
    'anthropic/claude-3.5-sonnet': { contextWindow: 200000 },
    'openai/gpt-4o': { contextWindow: 128000 },
    // ...
  },
  github: { ... },
  anthropic: { ... },
  // dynamic fetch fallback for unknown models
};

function getModelLimits(provider: string, model: string): ModelLimits | null;
```

### 2. Context Length Error Detection (nuvin-core)

Enhance `LLMError` to detect context overflow:

```typescript
// In base-llm.ts or new error-utils.ts
export function isContextOverflowError(error: unknown): boolean {
  if (!(error instanceof LLMError)) return false;

  // Check status codes (400, 413)
  if (error.statusCode === 400 || error.statusCode === 413) {
    const msg = error.message.toLowerCase();
    const patterns = [
      'context_length_exceeded',
      'maximum context length',
      'too many tokens',
      'token limit',
      'context window',
      'input too long',
      'request too large',
    ];
    return patterns.some(p => msg.includes(p));
  }
  return false;
}
```

### 3. Proactive Token Counting (optional enhancement)

Track tokens per message using usage data already captured:

```typescript
// In ConversationStore - already has incrementTokens()
// Extend to estimate if next message might exceed limit

async estimateContextUsage(conversationId: string): Promise<{
  estimatedTokens: number;
  modelLimit: number;
  percentUsed: number;
}>;
```

### 4. Auto-Summary Trigger (nuvin-cli)

In `OrchestratorManager.send()`:

```typescript
async send(content, opts, overrides) {
  try {
    return await withRetry(async () => {
      return this.orchestrator?.send(content, { ...opts, conversationId });
    }, retryOptions);
  } catch (error) {
    if (isContextOverflowError(error)) {
      // Emit event to notify user
      eventBus.emit('ui:line', {
        type: 'system',
        content: '⚠️ Context window exceeded. Running auto-summary...',
        color: 'yellow',
      });

      // Run summary (use beta compression for speed, or LLM summary)
      await this.autoSummarize();

      // Retry the original request
      return this.send(content, opts, overrides);
    }
    throw error;
  }
}
```

### 5. Pre-emptive Warning (optional UX enhancement)

Before sending, check if approaching limit:

```typescript
// In OrchestratorManager or orchestrator
const usage = await this.conversationStore.getConversationMetadata(conversationId);
const limit = getModelLimits(provider, model);

if (usage.totalTokens && limit && usage.totalTokens > limit.contextWindow * 0.85) {
  eventBus.emit('ui:line', {
    type: 'system',
    content: `⚠️ Approaching context limit (${Math.round(usage.totalTokens/limit.contextWindow*100)}% used)`,
    color: 'yellow'
  });
}
```

---

## Implementation Phases

| Phase | Task | Location |
|-------|------|----------|
| **1** | Create `isContextOverflowError()` utility | `nuvin-core/llm-providers/` |
| **2** | Create model limits registry with common models | `nuvin-core/llm-providers/model-limits.ts` |
| **3** | Add auto-summary recovery in `OrchestratorManager.send()` | `nuvin-cli/services/OrchestratorManager.ts` |
| **4** | Add pre-emptive warning based on token tracking | `nuvin-cli/services/OrchestratorManager.ts` |
| **5** | (Optional) Dynamic limit fetching from provider APIs | `nuvin-core/llm-providers/` |

---

## Key Decisions to Make

1. **Summary method**: Use LLM summarization (better quality) or compression algorithm (faster, no API call)?
2. **Retry behavior**: Retry automatically after summary, or prompt user?
3. **Model limits source**: Hardcode common models, fetch from APIs, or let users configure?
4. **Warning threshold**: 80%? 85%? 90%?

---

## Error Message Patterns by Provider

### OpenAI / OpenRouter
- `"context_length_exceeded"`
- `"maximum context length is X tokens"`
- `"This model's maximum context length is X tokens"`

### Anthropic
- `"prompt is too long"`
- `"request too large"`

### GitHub Copilot
- `"input too long"`
- `"token limit exceeded"`

### DeepInfra
- `"context window exceeded"`
- `"maximum tokens"`
