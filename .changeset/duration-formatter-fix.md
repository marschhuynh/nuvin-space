---
"@nuvin/nuvin-cli": patch
---

fix(formatters): improve duration formatting for minutes

- Fix formatDuration to omit "0s" when displaying whole minutes (e.g., "2m" instead of "2m 0s")
