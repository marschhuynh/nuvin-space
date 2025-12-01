---
"@nuvin/nuvin-cli": patch
---

test(cli): remove outdated test and update imports

- Delete provider-registry.test.ts (no longer relevant with dynamic providers)
- Update stripAnsi and textInputPaste test imports to use core package
- Remove hardcoded provider assertion tests that don't apply to dynamic system