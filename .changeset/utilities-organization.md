---
"@nuvin/nuvin-cli": patch
"@nuvin/nuvin-core": minor
---

refactor(core/cli): move string utilities to core package

- Remove CLI utils.ts wrapper file
- Update imports to use @nuvin/nuvin-core utilities directly
- Move stripAnsiAndControls and canonicalizeTerminalPaste to core exports
- Update test imports to reference core package utilities
- Ensure consistent utility usage across packages