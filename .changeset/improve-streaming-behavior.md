---
"@nuvin/nuvin-core": patch
---

Improve streaming behavior by only stripping leading newlines from the first chunk. Emit AssistantMessage events for both streaming and non-streaming modes to ensure proper UI finalization and markdown rendering.
