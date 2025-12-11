---
"@nuvin/nuvin-cli": patch
---

feat(ui): improve UI rendering and transient message handling

- Add `isTransient` metadata flag for temporary system messages (retry notifications)
- Improve ChatDisplay dynamic rendering: skip transient messages when scanning for pending operations
- Fix sub-agent activity display: better text wrapping and parameter truncation
- Enhance tool call duration formatting with `formatDuration()` utility
- Fix merging logic to always propagate metadata updates (including sub-agent state)
