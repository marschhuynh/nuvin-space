---
"@nuvin/nuvin-cli": patch
---

Fix markdown rendering for final assistant messages. Always update content and trigger re-render when streaming completes to ensure markdown is properly rendered. Previously, final messages would sometimes display raw markdown instead of formatted content.
