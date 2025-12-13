---
"@nuvin/nuvin-cli": patch
---

Fix crash when loading old history files with missing metadata

- Add `get()` utility for safe nested property access
- Update ToolResultView to handle missing `metadata.stats` and other optional fields
- Gracefully degrade display when metadata is incomplete
