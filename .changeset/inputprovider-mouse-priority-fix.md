---
"@nuvin/nuvin-cli": patch
---

Fix InputProvider mouse priority handling for better event management

- Set default mouse priority to subscriber ID instead of fixed 0 for proper event ordering
- Add dependency array fixes to prevent unnecessary re-renders
- Improve mouse subscription logic to handle priority conflicts better