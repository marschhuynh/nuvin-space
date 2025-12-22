---
"@nuvin/nuvin-cli": patch
---

Refactor FlexLayout to use AutoScrollBox for chat content

- Simplify FlexLayout by removing VirtualizedChat dependency
- Use AutoScrollBox for scrollable chat content with mouse wheel support
- Remove unused FixedLayout and VirtualizedList components
