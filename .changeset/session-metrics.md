---
"@nuvin/nuvin-core": minor
"@nuvin/nuvin-cli": minor
---

Refactor session metrics to be session-oriented

- **Breaking**: Remove `SessionMetricsTracker` from `@nuvin/nuvin-core` (unused)
- **Breaking**: `SessionMetricsService` methods now require explicit `conversationId` parameter
- Add `SessionBoundMetricsPort` adapter to bind metrics to specific sessions
- Fix `contextWindowUsage` not displaying - now correctly tracks and displays percentage in Footer
- Update subscriber callback to include `conversationId` for filtering
- Ensure all metrics operations use consistent session ID
- Update command handlers (`/clear`, `/new`, `/summary`) to pass session ID explicitly
