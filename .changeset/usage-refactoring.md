---
"@nuvin/nuvin-core": patch
---

Refactor usage data transformation to provider-owned pattern

- Add `transformUsage()` method to BaseLLM for generic OpenAI/Anthropic field name mapping
- Implement provider-specific `transformUsage()` in AnthropicAISDKLLM, GithubLLM
- Remove centralized `normalizeUsage()` utility in favor of provider-owned transformation
- Improve Anthropic token calculation: `prompt_tokens = input_tokens + cache_creation_input_tokens + cache_read_input_tokens`
- Ensure accurate context window tracking across all providers
