---
"@nuvin/nuvin-cli": minor
---

Add automatic update functionality with background updates

- Add UpdateChecker service to query npm registry for latest version
- Add AutoUpdater service with intelligent package manager detection (npm/pnpm/yarn)
- Integrate auto-update check on CLI startup with background update capability
- Support detection of installation method via executable path analysis
