---
"@nuvin/nuvin-core": patch
---

fix(agent-manager): make event callbacks async

- Update all `eventCallback` invocations to use `await`
- Ensures proper event sequencing for sub-agent lifecycle events
