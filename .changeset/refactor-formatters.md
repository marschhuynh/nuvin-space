---
"@nuvin/nuvin-cli": patch
---

Refactor: extract formatting utilities into centralized formatters module

- Add new `formatters.ts` utility module with reusable formatting functions
- Extract `formatTokens`, `formatDuration`, `formatRelativeTime`, `formatTimeFromSeconds`, `getUsageColor`, and `getMessageCountBadge` from components
- Improve token formatting to support millions (M) and billions (B) suffixes
- Add human-readable duration formatting (ms, seconds, minutes)
- Update Footer, RecentSessions, SubAgentActivity, ToolResultView, and ToolTimer to use centralized formatters
