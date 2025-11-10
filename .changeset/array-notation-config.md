---
"@nuvin/nuvin-cli": patch
---

Fix config set command to properly handle array notation

Added support for array bracket notation (e.g., `auth[0]`) in config paths. Previously, `nuvin config set providers.openrouter.auth[0].api-key "sk-xxx" --global` would create an incorrect structure with `auth[0]` as a string key. Now it properly creates an array with indexed elements.

- Fix createNestedObject to parse and handle array notation
- Fix deepMerge to merge array elements by index
- Add comprehensive tests (26 new tests)
