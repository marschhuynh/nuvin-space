# Feature Plan: Context Window Overflow Detection & Auto-Summary

## Problem

When conversation exceeds a model's context window limit, the LLM API returns an error. Currently, the app just fails. We want to proactively detect when approaching the limit and auto-summarize to prevent errors.

## Architecture Overview

### Key Components

| Component | Location | Role |
|-----------|----------|------|
| `SessionMetricsTracker` | `nuvin-core/session-metrics.ts` | Tracks `currentWindowTokens` (last request's token count = context window usage) |
| `GenericLLM.getModels()` | `nuvin-core/llm-providers/llm-factory.ts` | Fetches models from provider API |
| `OrchestratorManager` | `nuvin-cli/source/services/` | CLI wrapper, has `summarize()` method |
| `/summary` command | `commands/definitions/summary/` | Manual summarization (LLM-based + beta compression) |

### Provider Model Limits (from `/models` endpoint)

| Provider | Context Window Field | Max Output Field |
|----------|---------------------|------------------|
| **GitHub (Copilot)** | `capabilities.limits.max_context_window_tokens` | `capabilities.limits.max_output_tokens` |
| **DeepInfra** | `metadata.context_length` | `metadata.max_tokens` |
| **Moonshot** | `context_length` (root level) | N/A |
| **OpenRouter** | `context_length` (root), `top_provider.context_length` | `top_provider.max_completion_tokens` |

---

## Implementation Plan

### Phase 1: Model Limits Types & Normalizer

**New file: `nuvin-core/llm-providers/model-limits.ts`**

```typescript
export type ModelLimits = {
  contextWindow: number;
  maxOutput?: number;
};

export type ModelInfo = {
  id: string;
  limits?: ModelLimits;
};

// Normalize raw model response from provider API → ModelLimits
export function normalizeModelLimits(provider: string, model: Record<string, unknown>): ModelLimits | null {
  switch (provider) {
    case 'github':
      const ghLimits = (model as any).capabilities?.limits;
      return ghLimits?.max_context_window_tokens
        ? { contextWindow: ghLimits.max_context_window_tokens, maxOutput: ghLimits.max_output_tokens }
        : null;
    case 'deepinfra':
      const diMeta = (model as any).metadata;
      return diMeta?.context_length
        ? { contextWindow: diMeta.context_length, maxOutput: diMeta.max_tokens }
        : null;
    case 'moonshot':
      return (model as any).context_length
        ? { contextWindow: (model as any).context_length }
        : null;
    case 'openrouter':
      const ctx = (model as any).context_length ?? (model as any).top_provider?.context_length;
      return ctx
        ? { contextWindow: ctx, maxOutput: (model as any).top_provider?.max_completion_tokens }
        : null;
    default:
      return null;
  }
}

// Fallback static mapping for models without API limits
const FALLBACK_LIMITS: Record<string, Record<string, ModelLimits>> = {
  openrouter: {
    'anthropic/claude-sonnet-4': { contextWindow: 200000, maxOutput: 16000 },
    'openai/gpt-4o': { contextWindow: 128000, maxOutput: 16384 },
    'openai/gpt-4.1': { contextWindow: 128000, maxOutput: 32768 },
  },
  github: {
    'gpt-4.1': { contextWindow: 128000, maxOutput: 16384 },
    'claude-sonnet-4': { contextWindow: 200000, maxOutput: 16000 },
  },
  deepinfra: {
    'meta-llama/Meta-Llama-3.1-70B-Instruct': { contextWindow: 131072, maxOutput: 131072 },
  },
  moonshot: {
    'moonshot-v1-8k': { contextWindow: 8192 },
    'moonshot-v1-32k': { contextWindow: 32768 },
  },
};

export function getFallbackLimits(provider: string, model: string): ModelLimits | null {
  return FALLBACK_LIMITS[provider]?.[model] ?? null;
}
```

### Phase 2: Extend LLMPort & GenericLLM

**Modify: `nuvin-core/llm-providers/llm-factory.ts`**

- Add `provider` field to `GenericLLM`
- Modify `getModels()` to return normalized `ModelInfo[]` with limits

```typescript
async getModels(signal?: AbortSignal): Promise<ModelInfo[]> {
  const rawModels = await this._fetchRawModels(signal);
  return rawModels.map(m => ({
    id: m.id,
    limits: normalizeModelLimits(this.provider, m),
  }));
}
```

**Update `LLMPort` interface in `ports.ts`:**

```typescript
getModels?(signal?: AbortSignal): Promise<ModelInfo[]>;
```

### Phase 3: Model Limits Cache

**New file: `nuvin-cli/source/services/ModelLimitsCache.ts`**

```typescript
import type { ModelLimits, ModelInfo } from '@nuvin/nuvin-core';
import { getFallbackLimits } from '@nuvin/nuvin-core';

export class ModelLimitsCache {
  private cache: Map<string, ModelLimits> = new Map();

  async getLimit(
    provider: string,
    model: string,
    fetchModels?: () => Promise<ModelInfo[]>
  ): Promise<ModelLimits | null> {
    const key = `${provider}:${model}`;
    
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    // Try fetching from API
    if (fetchModels) {
      try {
        const models = await fetchModels();
        // Cache all fetched models
        for (const m of models) {
          if (m.limits) {
            this.cache.set(`${provider}:${m.id}`, m.limits);
          }
        }
        if (this.cache.has(key)) {
          return this.cache.get(key)!;
        }
      } catch {
        // Fallback to static mapping on error
      }
    }

    // Fallback to static mapping
    const fallback = getFallbackLimits(provider, model);
    if (fallback) {
      this.cache.set(key, fallback);
    }
    return fallback;
  }

  clear(): void {
    this.cache.clear();
  }
}
```

### Phase 4: Auto-Summary Based on Metrics

**Modify: `nuvin-cli/source/services/OrchestratorManager.ts`**

Use `SessionMetricsTracker.currentWindowTokens` to check against model limit before/after each request.

```typescript
// Add to OrchestratorManager
private metricsTracker: SessionMetricsTracker;
private modelLimitsCache: ModelLimitsCache;

// In send() method, after successful response:
async send(content, opts, overrides) {
  const result = await this._doSend(content, opts, overrides);
  
  // Check if approaching context limit
  await this.checkContextWindowUsage(conversationId);
  
  return result;
}

private async checkContextWindowUsage(conversationId: string): Promise<void> {
  const metrics = this.metricsTracker.get(conversationId);
  if (!metrics) return;

  const currentConfig = this.getCurrentConfig();
  const limits = await this.modelLimitsCache.getLimit(
    currentConfig.provider,
    currentConfig.model,
    () => this.llmFactory.createLLM(currentConfig.provider).getModels?.()
  );

  if (!limits) return;

  const usage = metrics.currentWindowTokens / limits.contextWindow;
  const WARNING_THRESHOLD = 0.85;
  const AUTO_SUMMARY_THRESHOLD = 0.95;

  if (usage >= AUTO_SUMMARY_THRESHOLD) {
    eventBus.emit('ui:line', {
      id: crypto.randomUUID(),
      type: 'system',
      content: `⚠️ Context window at ${Math.round(usage * 100)}%. Running auto-summary...`,
      color: 'yellow',
    });
    await this.summarize();
  } else if (usage >= WARNING_THRESHOLD) {
    eventBus.emit('ui:line', {
      id: crypto.randomUUID(),
      type: 'system',
      content: `⚠️ Context window at ${Math.round(usage * 100)}% (${metrics.currentWindowTokens}/${limits.contextWindow} tokens)`,
      color: 'yellow',
    });
  }
}
```

---

## Implementation Phases Summary

| Phase | Task | Location | Priority |
|-------|------|----------|----------|
| **1** | Create model limits types & normalizer | `nuvin-core/llm-providers/model-limits.ts` | High |
| **2** | Extend `GenericLLM.getModels()` to return normalized limits | `nuvin-core/llm-providers/llm-factory.ts` | High |
| **3** | Create `ModelLimitsCache` service | `nuvin-cli/source/services/ModelLimitsCache.ts` | High |
| **4** | Add context window check in `OrchestratorManager.send()` | `nuvin-cli/source/services/OrchestratorManager.ts` | High |
| **5** | Add `SessionMetricsTracker` integration | `nuvin-cli/source/services/OrchestratorManager.ts` | High |

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Detection method** | Use `currentWindowTokens` from `SessionMetricsTracker` | Already tracked per request, represents actual context usage |
| **Warning threshold** | 85% | Give user time to react before auto-summary |
| **Auto-summary threshold** | 95% | Trigger before hitting actual limit |
| **Limits source** | API first → fallback to static mapping | Keeps limits up-to-date without manual maintenance |
| **Summary method** | Use existing `summarize()` method | Already implemented, LLM-based quality |

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `nuvin-core/llm-providers/model-limits.ts` | **New** - types, normalizer, fallback map |
| `nuvin-core/llm-providers/index.ts` | **Modify** - export new module |
| `nuvin-core/llm-providers/llm-factory.ts` | **Modify** - add provider field, normalize in `getModels()` |
| `nuvin-core/ports.ts` | **Modify** - update `LLMPort.getModels()` return type |
| `nuvin-cli/source/services/ModelLimitsCache.ts` | **New** - caching layer |
| `nuvin-cli/source/services/OrchestratorManager.ts` | **Modify** - add metrics tracker, context window check |
