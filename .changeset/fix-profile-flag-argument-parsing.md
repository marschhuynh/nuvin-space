---
"@nuvin/nuvin-cli": patch
---

Fix `--profile` flag being passed as argument to subcommand handlers

- Changed subcommand handlers from `process.argv.slice(3)` to `cli.input.slice(1)`
- This fixes the issue where `nuvin --profile work mcp list` showed "Unknown mcp command: work"
- Affected handlers: config, profile, and mcp subcommands
- meow parses flags into `cli.flags`, so we must use `cli.input` for positional arguments only
