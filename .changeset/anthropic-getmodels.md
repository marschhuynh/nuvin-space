---
"@nuvin/nuvin-core": minor
"@nuvin/nuvin-cli": patch
---

Add getModels support for Anthropic provider

**Core Changes:**
- Implement `getModels()` method in `AnthropicAISDKLLM` class
- Fetch models from Anthropic API endpoint: `https://api.anthropic.com/v1/models`
- Support both API key and OAuth authentication for model fetching
- Handle OAuth token refresh on 401/403 errors during model listing
- Add Anthropic case to `normalizeModelLimits()` function
- Use `display_name` field from API response for Anthropic model names
- Update fallback limits with all current Claude models (Opus 4.5, Haiku 4.5, Sonnet 4.5, etc.)

**CLI Changes:**
- Update `LLMFactory.getModels()` to support Anthropic OAuth credentials
- Allow model fetching with either API key or OAuth authentication for Anthropic

**Tests:**
- Add comprehensive unit tests for getModels functionality
- Add integration tests for real API calls (skipped without credentials)
- All existing tests continue to pass
