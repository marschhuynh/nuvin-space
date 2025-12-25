---
"@nuvin/nuvin-cli": patch
---

Remove deprecated virtualized components and simplify chat display

- Delete VirtualizedChat and VirtualizedList components
- Clean up FlexLayout by removing chatFocus prop
- Replace ╰─ box drawing characters with └─ for consistency
- Streamline message rendering in MessageLine