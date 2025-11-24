---
"@nuvin/nuvin-cli": patch
---

Improve diff view and tool content rendering

- Refactor FileDiffView to use flex wrapping for better long-line handling
- Replace Markdown with plain text for file_new tool content and streaming messages
- Clean up RecentSessions styling with underline title
- Remove unused isInitialMountRef from app.tsx
- Update snapshots for new diff line format
