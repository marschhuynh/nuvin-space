---
"@nuvin/nuvin-cli": minor
---

Add input history navigation with up/down arrow keys

- Press ↑/↓ to recall previously submitted messages
- Loads history from memory on startup, with fallback to last session's message
- Multi-line input requires double-press at first/last line to navigate history
- Extracts history logic into reusable `useInputHistory` hook
