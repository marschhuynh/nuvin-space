# Retry Transport Layer Refactoring Plan

## Problem Statement

The current retry mechanism in `nuvin-cli` has several issues:

1. **Wrong abstraction layer** - Retry wraps `OrchestratorManager.send()` which includes orchestration logic, not just the HTTP request
2. **Fixed delay** - Uses constant 10s delay instead of exponential backoff
3. **No jitter** - Can cause thundering herd on rate limits
4. **Duplicate code** - Both `send()` and `retry()` methods have identical retry logic
5. **CLI-specific** - Lives in `nuvin-cli/source/utils/retry-utils.ts`, can't be reused by other consumers of `nuvin-core`
6. **Default true for unknown errors** - `isRetryableError()` returns `true` for unknown errors which is risky

## Current Architecture

```
┌─────────────────────────────────────────────────────┐
│  OrchestratorManager.send()                         │
│    └── withRetry() ← retry wraps entire call        │
│          └── orchestrator.send()                    │
│                └── BaseLLM.streamCompletion()       │
│                      └── FetchTransport.post()      │
└─────────────────────────────────────────────────────┘
```

**Files involved:**
- `packages/nuvin-cli/source/services/OrchestratorManager.ts` - retry wrapper
- `packages/nuvin-cli/source/utils/retry-utils.ts` - `withRetry()` function
- `packages/nuvin-cli/source/utils/error-classification.ts` - `isRetryableError()`
- `packages/nuvin-core/src/transports/transport.ts` - `FetchTransport`
- `packages/nuvin-core/src/llm-providers/base-llm.ts` - uses transport

## Proposed Architecture

```
┌─────────────────────────────────────────────────────┐
│  OrchestratorManager.send() (no retry)              │
├─────────────────────────────────────────────────────┤
│  AgentOrchestrator.send()                           │
├─────────────────────────────────────────────────────┤
│  BaseLLM.streamCompletion()                         │
├─────────────────────────────────────────────────────┤
│  RetryTransport (NEW) ← retry happens here          │
│   - wraps inner HttpTransport                       │
│   - exponential backoff with jitter                 │
│   - respects Retry-After header                     │
│   - configurable retry policy                       │
│   - onRetry/onExhausted callbacks                   │
├─────────────────────────────────────────────────────┤
│  FetchTransport / BaseBearerAuthTransport           │
└─────────────────────────────────────────────────────┘
```

## Implementation Tasks

### Phase 1: Core Infrastructure (nuvin-core)

#### Task 1.1: Create RetryTransport
**File:** `packages/nuvin-core/src/transports/retry-transport.ts`

```typescript
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterFactor: number; // 0-1, adds randomness to delay
  retryableStatusCodes: number[];
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
  onExhausted?: (error: Error, attempts: number) => void;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
  jitterFactor: 0.2,
  retryableStatusCodes: [429, 500, 502, 503, 504],
};

export class RetryTransport implements HttpTransport {
  constructor(
    private inner: HttpTransport,
    private config: Partial<RetryConfig> = {}
  ) {}

  // Implements get() and post() with retry logic
  // Parses Retry-After header for 429 responses
}
```

#### Task 1.2: Move Error Classification
**From:** `packages/nuvin-cli/source/utils/error-classification.ts`
**To:** `packages/nuvin-core/src/transports/error-classification.ts`

Changes:
- Remove default `true` return for unknown errors → return `false` (fail-safe)
- Add `isRetryableStatusCode(status: number)` helper
- Export from `transports/index.ts`

#### Task 1.3: Add Backoff Utilities
**File:** `packages/nuvin-core/src/transports/backoff.ts`

```typescript
export function calculateBackoff(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  multiplier: number,
  jitterFactor: number
): number;

export function parseRetryAfterHeader(header: string | null): number | null;
```

### Phase 2: Integration

#### Task 2.1: Update BaseLLM
**File:** `packages/nuvin-core/src/llm-providers/base-llm.ts`

Add retry config to constructor options:

```typescript
export interface BaseLLMOptions {
  enablePromptCaching?: boolean;
  retry?: Partial<RetryConfig>;
}
```

Update `createTransport()` implementations to wrap with `RetryTransport` when retry config provided.

#### Task 2.2: Update Provider Implementations
Files:
- `packages/nuvin-core/src/llm-providers/llm-anthropic-aisdk.ts`
- `packages/nuvin-core/src/llm-providers/llm-github.ts`

Ensure they pass retry config through to transport creation.

#### Task 2.3: Update LLMFactory in CLI
**File:** `packages/nuvin-cli/source/services/LLMFactory.ts`

Pass retry config when creating LLM instances:

```typescript
createLLM(provider: ProviderKey, options?: { httpLogFile?: string }) {
  return new SomeLLM(apiKey, {
    retry: {
      maxRetries: 5,
      onRetry: (attempt, error, delayMs) => {
        eventBus.emit('ui:line', { /* retry notification */ });
      },
    },
  });
}
```

### Phase 3: Cleanup

#### Task 3.1: Remove Retry from OrchestratorManager
**File:** `packages/nuvin-cli/source/services/OrchestratorManager.ts`

- Remove `withRetry` import
- Remove retry wrapper from `send()` method
- Remove retry wrapper from `retry()` method
- Keep `AbortError` handling

#### Task 3.2: Deprecate/Remove Old Retry Utils
**File:** `packages/nuvin-cli/source/utils/retry-utils.ts`

- Mark as deprecated or remove entirely
- Update any remaining usages

### Phase 4: Testing

#### Task 4.1: Unit Tests for RetryTransport
**File:** `packages/nuvin-core/src/tests/retry-transport.test.ts`

Test cases:
- Successful request (no retry)
- Retry on 429 with Retry-After header
- Retry on 5xx errors
- Exponential backoff timing
- Jitter randomness
- Max retries exhausted
- Non-retryable errors (4xx except 429)
- AbortSignal cancellation during retry
- onRetry callback invocation
- onExhausted callback invocation

#### Task 4.2: Integration Tests
**File:** `packages/nuvin-core/src/tests/base-llm-retry.test.ts`

Test LLM with retry transport end-to-end.

## Configuration Options

### Default Retry Policy
```typescript
{
  maxRetries: 3,
  baseDelayMs: 1000,      // 1s initial delay
  maxDelayMs: 60000,      // 60s max delay
  backoffMultiplier: 2,   // exponential: 1s, 2s, 4s, 8s...
  jitterFactor: 0.2,      // ±20% randomness
  retryableStatusCodes: [429, 500, 502, 503, 504],
}
```

### Rate Limit Handling (429)
- Parse `Retry-After` header if present
- Use header value as delay (capped at maxDelayMs)
- Fall back to exponential backoff if no header

### Backoff Formula
```
delay = min(baseDelayMs * (multiplier ^ attempt), maxDelayMs)
jitter = delay * jitterFactor * random(-1, 1)
finalDelay = delay + jitter
```

## Migration Path

1. Implement RetryTransport in nuvin-core (no breaking changes)
2. Add retry config option to LLM constructors (optional, backward compatible)
3. Update CLI to use new retry config
4. Remove old retry logic from OrchestratorManager
5. Deprecate retry-utils.ts

## Files to Modify

### New Files
- `packages/nuvin-core/src/transports/retry-transport.ts`
- `packages/nuvin-core/src/transports/backoff.ts`
- `packages/nuvin-core/src/transports/error-classification.ts`
- `packages/nuvin-core/src/tests/retry-transport.test.ts`

### Modified Files
- `packages/nuvin-core/src/transports/index.ts` (exports)
- `packages/nuvin-core/src/llm-providers/base-llm.ts`
- `packages/nuvin-cli/source/services/LLMFactory.ts`
- `packages/nuvin-cli/source/services/OrchestratorManager.ts`

### Deprecated/Removed Files
- `packages/nuvin-cli/source/utils/retry-utils.ts`
- `packages/nuvin-cli/source/utils/error-classification.ts`

## Open Questions

1. Should retry be enabled by default or opt-in?
2. Should we expose retry config in user-facing config file?
3. How to handle streaming responses that fail mid-stream?
4. Should we add circuit breaker pattern for repeated failures?
