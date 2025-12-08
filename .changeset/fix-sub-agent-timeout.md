---
"@nuvin/nuvin-core": patch
---

fix(core): improve timeout handling in sub-agent execution

- Fix timeout to properly abort downstream operations (LLM calls, tool executions)
- Use AbortSignal.any() to combine user abort signal with timeout signal
- Use Promise.race() for immediate rejection on abort or timeout
- Add comprehensive test suite for sub-agent timeout with running bash tools
- Test abort vs timeout priority and signal propagation to tools

Previously, timeout only rejected the promise but didn't cancel running operations, leading to potential resource leaks. Now timeout properly propagates abort signal to orchestrator and all downstream tools.
