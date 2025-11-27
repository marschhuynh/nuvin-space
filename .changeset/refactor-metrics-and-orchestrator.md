---
"@nuvin/nuvin-core": minor
"@nuvin/nuvin-cli": minor
---

Refactor session metrics and orchestrator architecture

- Move metrics tracking to dedicated port in orchestrator
- Add model limits support for context window management
- Simplify orchestrator dependency injection with optional deps
- Remove deprecated setMemory() from CommandRegistry
- Fix all related tests
