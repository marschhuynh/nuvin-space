---
"@nuvin/nuvin-cli": minor
---

Add explain mode with Ctrl+E toggle and improve tool result display

**Explain Mode Features:**
- Press Ctrl+E to toggle between interactive and explain modes
- View-only mode with full tool call/result details
- Pretty-printed JSON parameters with 2-space indentation
- Full content display without truncation
- Footer shows "Ctrl+E to toggle" message in explain mode

**Tool Display Improvements:**
- Add help bar above input showing keyboard shortcuts (Ctrl+E, ESC×2, /)
- Simplify file_new and file_read display in normal mode
  - Show only file path and status (e.g., "└─ Created", "└─ Read 59 lines")
  - Hide verbose content and "Done" line
- Explain mode shows full file content with Markdown rendering
- Add friendly tool name mapping (file_read → "Read file", todo_write → "Update todo", etc.)

**Status Handling:**
- Add "Denied" status for user-denied tool approvals
- Consistent yellow/warning color for Denied and Aborted statuses
- Improved status line logic for cleaner output

**User Experience:**
- Clean, minimal display in normal mode
- Detailed inspection mode via Ctrl+E toggle
- Consistent across all tool types
- Better visual hierarchy with proper tree branching (├─, └─)
