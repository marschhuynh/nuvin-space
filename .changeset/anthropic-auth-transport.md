---
"@nuvin/nuvin-core": patch
---

refactor(transports): extract AnthropicAuthTransport from LLM class

- Move OAuth token refresh logic to dedicated `AnthropicAuthTransport` class
- Add `createFetchFunction()` for AI SDK integration
- Add `createRetryTransport()` factory method
- Export from transports index
- Simplify `AnthropicAISDKLLM` to use the new transport
