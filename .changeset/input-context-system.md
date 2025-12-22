---
"@nuvin/nuvin-cli": minor
---

feat(input): add centralized InputContext system with priority-based input handling

- Add InputProvider with middleware chain for global input handlers (Ctrl+C, paste detection, explain mode toggle)
- Add useInput hook with priority-based subscription system for focus management
- Add parseKeypress utility supporting both legacy terminals and Kitty keyboard protocol
- Migrate all components from ink's useInput to custom InputContext
