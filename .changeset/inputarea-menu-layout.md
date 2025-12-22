---
"@nuvin/nuvin-cli": patch
---

Fix InputArea command menu positioning and layout

- Remove absolute positioning from command menu to improve layout flow
- Use available terminal rows for better space utilization
- Simplify menu rendering by removing redundant props and positioning logic