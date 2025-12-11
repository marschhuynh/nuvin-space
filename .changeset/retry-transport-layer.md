---
"@nuvin/nuvin-core": patch
"@nuvin/nuvin-cli": patch
---

feat(retry): move retry logic to transport layer with exponential backoff

**Core Changes:**
- Add `RetryTransport` with exponential backoff and jitter (maxRetries: 10, baseDelay: 1s, maxDelay: 60s)
- Respects `Retry-After` headers from API responses
- Configurable callbacks: `onRetry`, `onExhausted`, `shouldRetry`
- Error classification: retry on 429, 500, 502, 503, 504, network errors, timeouts
- Add `AbortError` for user-initiated cancellations
- Export retry utilities: `isRetryableError`, `isRetryableStatusCode`, `calculateBackoff`, `parseRetryAfterHeader`
- Add `retry?: Partial<RetryConfig>` option to `BaseLLMOptions`
- `GenericLLM` and `GithubLLM` wrap transports with `RetryTransport` when retry config provided
- Remove `retry?: boolean` option from `SendMessageOptions`

**CLI Changes:**
- Integrate retry configuration into `LLMFactory` with default retry callbacks
- Show retry notifications in UI with countdown timer
- Remove application-layer retry logic from `OrchestratorManager.send()`
- Delete obsolete `retry()` method from OrchestratorManager
- Deprecate CLI retry utilities (`retry-utils.ts`, `error-classification.ts`)
