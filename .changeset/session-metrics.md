---
"@nuvin/nuvin-core": minor
"@nuvin/nuvin-cli": minor
---

Add session metrics tracking for conversations

- Add SessionMetrics type and SessionMetricsTracker class for tracking cumulative and per-request metrics
- Track total tokens, request count, tool call count, total time, and total price across session
- Display session metrics in footer: tokens (current/total), requests, tools, cost
- Fix tool call counting to only increment after tool execution completes
- Add estimated_cost → cost mapping for providers like MiniMax
- Add recordRequestMetrics method to ConversationStore for persisting metrics
