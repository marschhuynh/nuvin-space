---
"@nuvin/nuvin-cli": patch
---

Lazy session directory creation - directories are now only created when data is actually written (history, events, or HTTP logs), preventing empty session directories from accumulating
