---
"@nuvin/nuvin-core": patch
"@nuvin/nuvin-cli": patch
---

fix: update contextWindowUsage in real-time when LLM call completes

- Auto-calculate contextWindowUsage in recordLLMCall when contextWindowLimit is set
- Set contextWindowLimit before orchestrator.send() to enable immediate usage updates
- Fixes delayed contextWindowUsage display that only updated after request completion
