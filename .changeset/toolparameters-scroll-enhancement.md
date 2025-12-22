---
"@nuvin/nuvin-cli": patch
---

Improve ToolParameters with AutoScrollBox for better content handling

- Wrap ToolParameters in AutoScrollBox to handle large parameter sets
- Calculate dynamic maxHeight based on terminal dimensions for optimal space usage
- Enable smooth scrolling with scrollStep configuration
- Improve parameter display layout and structure