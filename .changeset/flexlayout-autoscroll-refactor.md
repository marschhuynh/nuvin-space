---
"@nuvin/nuvin-cli": patch
---

Refactor FlexLayout to use AutoScrollBox with percentage-based sizing

- Replace fixed height calculation with percentage-based `maxHeight="100%"`
- Remove manual content height calculations for simpler layout logic
- Simplify component structure by removing redundant Box containers
- Improve scrolling behavior in virtualized message lists