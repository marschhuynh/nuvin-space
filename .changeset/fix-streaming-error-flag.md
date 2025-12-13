---
"@nuvin/nuvin-cli": patch
---

Fix stale isStreaming flag causing messages to stay dynamic after errors

- Clear isStreaming flag when error occurs during streaming
- Add fallback: ignore isStreaming=true if message is not the last non-transient
- Extract calculateStaticCount to utils/staticCount.ts with tests
