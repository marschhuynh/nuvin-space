# Error Flow Analysis: UI → LLM → Network and Back

This document analyzes the complete error flow in the nuvin architecture, from user interaction through the LLM layer to network operations, and how errors propagate back to the UI.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                   UI LAYER                                  │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────────────────────┐ │
│  │ useMessage  │───▶│ useOrchest-  │───▶│     OrchestratorManager         │ │
│  │ handleError │    │   rator      │    │                                 │ │
│  └─────────────┘    └──────────────┘    └─────────────────────────────────┘ │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ORCHESTRATION LAYER                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                        AgentOrchestrator                                ││
│  │   • Manages conversation flow                                           ││
│  │   • Handles tool execution                                              ││
│  │   • Emits events (MessageStarted, AssistantChunk, Error, etc.)         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 LLM LAYER                                   │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────────────┐ │
│  │   LLMFactory   │  │    BaseLLM     │  │  AnthropicAISdkLLM / GithubLLM │ │
│  │                │─▶│   (abstract)   │◀─│      (concrete impls)          │ │
│  └────────────────┘  └────────────────┘  └────────────────────────────────┘ │
│                              │                                              │
│                              ▼                                              │
│                      ┌──────────────┐                                       │
│                      │   LLMError   │  ← Unified error type                 │
│                      │  • statusCode│                                       │
│                      │  • isRetryable│                                      │
│                      └──────────────┘                                       │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TRANSPORT LAYER                                │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         RetryTransport                                  ││
│  │   • Exponential backoff with jitter                                     ││
│  │   • Respects Retry-After header                                         ││
│  │   • Configurable shouldRetry callback                                   ││
│  │   • Retryable codes: 408, 429, 500, 502, 503, 504, 520-524              ││
│  └────────────────────────────────────┬────────────────────────────────────┘│
│                                       │                                     │
│  ┌────────────────────┐  ┌────────────┴───────────┐  ┌───────────────────┐ │
│  │ AnthropicAuth-     │  │   GithubAuthTransport  │  │ SimpleBearerAuth- │ │
│  │ Transport          │  │   • Token exchange     │  │ Transport         │ │
│  │ • OAuth refresh    │  │   • 401 retry          │  │                   │ │
│  └────────────────────┘  └────────────────────────┘  └───────────────────┘ │
│                                       │                                     │
│                              ┌────────┴────────┐                            │
│                              │  FetchTransport │  ← Raw HTTP                │
│                              │  (uses fetch()) │                            │
│                              └─────────────────┘                            │
└────────────────────────────────────────────────────────────────────────────-┘
```

## Error Types

### 1. LLMError (Core Error Type)
```typescript
class LLMError extends Error {
  statusCode?: number;      // HTTP status code (e.g., 429, 500)
  isRetryable: boolean;     // Whether retry is possible
  cause?: unknown;          // Original error
}
```

### 2. AbortError
```typescript
class AbortError extends Error {
  name = 'AbortError';      // User/system cancellation
}
```

## Error Flow: Request Path

### Step 1: UI → Orchestrator
```
User Input
    │
    ▼
useHandleSubmit.processMessage()
    │
    ├──▶ try { await orchestratorManager.send() }
    │
    └──▶ catch → handleError(message) → appendLine({ type: 'error', color: 'red' })
```

### Step 2: Orchestrator → LLM
```
AgentOrchestrator.run()
    │
    ├──▶ Check signal.aborted → throw Error('Aborted')
    │
    ├──▶ llm.streamCompletion() or llm.completion()
    │         │
    │         ├──▶ Success → emit AssistantChunk events
    │         │
    │         └──▶ Error → LLMError thrown
    │
    └──▶ emit MessageCompleted or Error event
```

### Step 3: LLM → Transport
```
AnthropicAISdkLLM.streamCompletion()
    │
    ├──▶ translateError()
    │         │
    │         ├── 429 → LLMError('Rate limit exceeded', 429, isRetryable: true)
    │         ├── 401/403 → LLMError('Authentication failed', 401, isRetryable: false)
    │         ├── 400 → LLMError('Invalid request', 400, isRetryable: false)
    │         ├── 5xx → LLMError('Service unavailable', 5xx, isRetryable: true)
    │         └── AbortError → LLMError('Request was cancelled', isRetryable: false)
    │
    └──▶ throw LLMError
```

### Step 4: Transport → Network
```
RetryTransport.executeWithRetry()
    │
    ├──▶ Check signal.aborted → throw AbortError
    │
    ├──▶ AuthTransport.post()
    │         │
    │         ├──▶ FetchTransport.post() → fetch()
    │         │
    │         └──▶ 401 + OAuth → refresh token → retry once
    │
    ├──▶ Response status check
    │         │
    │         ├── isRetryableStatusCode(status) → retry with backoff
    │         │     [408, 429, 500, 502, 503, 504, 520-524]
    │         │
    │         └── Non-retryable → return response (let LLM handle)
    │
    └──▶ Network error (ECONNREFUSED, ETIMEDOUT, etc.)
              │
              └──▶ isRetryableError() → retry or throw
```

## Error Flow: Response Path (Bubbling Up)

```
Network Error / HTTP Error
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ RetryTransport                                          │
│   • Retry up to maxRetries (default: 3)                │
│   • Backoff: baseDelay * 2^attempt + jitter            │
│   • onRetry callback for logging                        │
│   • onExhausted callback when all retries fail         │
└────────────────────────┬────────────────────────────────┘
                         │ (throws after exhausted)
                         ▼
┌─────────────────────────────────────────────────────────┐
│ LLM Provider (e.g., AnthropicAISdkLLM)                 │
│   • Catches raw errors                                  │
│   • Translates to LLMError with:                       │
│     - User-friendly message                             │
│     - Status code                                       │
│     - isRetryable flag                                  │
└────────────────────────┬────────────────────────────────┘
                         │ (throws LLMError)
                         ▼
┌─────────────────────────────────────────────────────────┐
│ AgentOrchestrator                                       │
│   • Catches LLMError                                    │
│   • Emits error event to UI                             │
│   • May retry at conversation level (if retryable)     │
└────────────────────────┬────────────────────────────────┘
                         │ (emits event)
                         ▼
┌─────────────────────────────────────────────────────────┐
│ OrchestratorManager                                     │
│   • Receives error events                               │
│   • Calls handleError(message)                          │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ UI (useMessage.handleError)                             │
│   • appendLine({ type: 'error', color: 'red' })        │
│   • User sees: "error: <message>"                       │
└─────────────────────────────────────────────────────────┘
```

## Retry Decision Matrix

| Error Type | Status Code | Retryable | Retry Strategy |
|------------|-------------|-----------|----------------|
| Rate Limit | 408, 429 | ✅ Yes | Exponential backoff, respect Retry-After |
| Server Error | 500, 502, 503, 504 | ✅ Yes | Exponential backoff |
| Cloudflare | 520-524 | ✅ Yes | Exponential backoff |
| Auth Error | 401, 403 | ❌ No | Fail immediately (unless token refresh) |
| Bad Request | 400 | ❌ No | Fail immediately |
| Not Found | 404 | ❌ No | Fail immediately |
| Network | ECONNREFUSED, ETIMEDOUT | ✅ Yes | Exponential backoff |
| Abort | User cancel | ❌ No | Fail immediately |

## Retry Configuration

```typescript
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
  jitterFactor: 0.2,
  retryableStatusCodes: DEFAULT_RETRYABLE_STATUS_CODES,
};

// Centralized in error-classification.ts
const DEFAULT_RETRYABLE_STATUS_CODES = [
  408,  // Request Timeout
  429,  // Too Many Requests
  500,  // Internal Server Error
  502,  // Bad Gateway
  503,  // Service Unavailable
  504,  // Gateway Timeout
  520,  // Cloudflare: Unknown Error
  521,  // Cloudflare: Web Server Is Down
  522,  // Cloudflare: Connection Timed Out
  523,  // Cloudflare: Origin Is Unreachable
  524,  // Cloudflare: A Timeout Occurred
];
```

## Special Cases

### 1. OAuth Token Refresh (Anthropic)
```
401/403 Response
    │
    ▼
AnthropicAuthTransport.ensureValidToken()
    │
    ├──▶ refreshAccessToken() with retry (3 attempts)
    │
    ├──▶ Success → update credentials → retry original request
    │
    └──▶ Failure → throw Error('Token refresh failed')
```

### 2. GitHub Copilot Token Exchange
```
Initial Request (no API key)
    │
    ▼
GithubAuthTransport.exchangeToken()
    │
    ├──▶ POST to github.com/copilot_internal/v2/token
    │
    ├──▶ Success → store token, use dynamic API URL
    │
    └──▶ 401 on request → re-exchange token → retry once
```

### 3. Abort Signal Propagation
```
User presses Ctrl+C / ESC
    │
    ▼
AbortController.abort()
    │
    ├──▶ Orchestrator: signal.aborted check → throw Error('Aborted')
    │
    ├──▶ RetryTransport: AbortError during sleep → stop retry
    │
    └──▶ fetch(): AbortError → propagate up immediately (no retry)
```

## Key Files

| Layer | File | Responsibility |
|-------|------|----------------|
| UI | `hooks/useMessage.ts` | Error display (`handleError`) |
| UI | `hooks/useOrchestrator.ts` | Orchestrator error handling |
| UI | `services/OrchestratorManager.ts` | Error event routing |
| Core | `orchestrator.ts` | Conversation error handling |
| LLM | `llm-providers/base-llm.ts` | `LLMError` class definition |
| LLM | `llm-providers/llm-anthropic-aisdk.ts` | Error translation |
| Transport | `transports/retry-transport.ts` | Retry logic, `AbortError` |
| Transport | `transports/error-classification.ts` | `isRetryableError()`, status codes |
| Transport | `transports/anthropic-transport.ts` | OAuth refresh with retry |
| Transport | `transports/github-transport.ts` | Token exchange |
