---
"@nuvin/nuvin-cli": minor
---

Add mouse scroll support to InputContext with new useMouse hook

- Add MouseEvent type and MouseHandler for mouse event handling
- Add parseMouseEvent() to detect SGR and X10 mouse protocol sequences
- Add subscribeMouse(), enableMouseMode(), disableMouseMode() to InputProvider
- Create useMouse hook that auto-enables mouse mode and subscribes to mouse events
- Mouse and keyboard events are handled separately to avoid interference
