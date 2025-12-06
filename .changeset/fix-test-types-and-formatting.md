---
"@nuvin/nuvin-cli": minor
"@nuvin/nuvin-core": patch
---

Refactor /new and /summary commands to preserve session history

**Session Management:**
- `/new` command now creates new session via `OrchestratorManager.createNewConversation()`
- Replace `ui:new:conversation` event with `conversation:created` event
- `ToolApprovalContext` listens to `conversation:created` to clear session-approved tools

**Auto-Summary & /summary Refactoring:**
- Auto-summary (at 95% context window) now creates a new session instead of replacing memory in-place
- `/summary` and `/summary beta` commands create new sessions with summary, preserving original
- Add `summarizedFrom` field to `ConversationMetadata` to track session lineage
- Add `summarizeAndCreateNewSession()` and `compressAndCreateNewSession()` methods to share logic

**Test Fixes:**
- Fix `commands.test.ts`: use `vi.hoisted()` for proper mock hoisting
- Fix `context-window-auto-summary.test.ts`: update constructor call, fix types
- Apply biome formatting to all test files
