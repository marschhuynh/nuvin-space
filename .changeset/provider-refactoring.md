---
"@nuvin/nuvin-cli": minor
"@nuvin/nuvin-core": minor
---

refactor(core/cli): migrate to dynamic provider discovery

- Replace static provider lists with dynamic discovery from core
- Add getProviderLabel() to core for centralized label management  
- Update provider config schema: name → key field with optional label
- Enhance InitialConfigSetup to use available providers dynamically
- Remove hardcoded PROVIDER_* constants in favor of runtime discovery