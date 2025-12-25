---
"@nuvin/nuvin-cli": patch
---

Refactor tool approval UI to use FocusContext and improve keyboard navigation

- Replace manual action selection with FocusContext-based focus system
- Add dedicated ActionButton components with proper focus handling
- ToolEditInput now integrates with focus system
- Simplify keyboard shortcuts to 1/2/3 with Tab/Ctrl+N/P for navigation