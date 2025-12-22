---
"@nuvin/nuvin-cli": patch
---

feat(input): add Kitty terminal keyboard protocol support

- Detect Kitty terminal via TERM, TERM_PROGRAM, and KITTY_* env vars
- Enable Kitty keyboard protocol (CSI u encoding) for better modifier key detection
- Handle Shift+Enter as newline insertion at parser level
- Support Ctrl+V paste detection for image clipboard in Kitty
