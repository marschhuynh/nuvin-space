---
"@nuvin/nuvin-cli": patch
---

Enhance AutoScrollBox with improved flexibility and overflow handling

- Allow `maxHeight` prop to accept both `number` and `string` types for better layout integration
- Add `mousePriority` prop to control mouse event priority in complex layouts
- Fix overflow handling by adding `overflow="hidden"` to container for better scroll behavior
- Improve integration with flexible layout systems