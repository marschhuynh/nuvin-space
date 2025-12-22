---
"@nuvin/nuvin-cli": patch
---

Disable incremental rendering in CLI default config to avoid rendering artifacts and improve stability

- Set incrementalRendering to false in the CLI options
- No public API changes
