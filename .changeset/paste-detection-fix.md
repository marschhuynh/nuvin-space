---
"@nuvin/nuvin-cli": patch
---

fix(paste): improve paste detection for text and image clipboard

- Add bracketed paste sequence detection in middleware
- Add Ctrl+V keystroke detection for Kitty terminals with image-only clipboard
- Fix parseKeypress to pass through bracketed paste sequences as raw input
