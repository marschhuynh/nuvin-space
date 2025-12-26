---
"@nuvin/nuvin-cli": minor
---

Add profile parameter support to subcommand handlers

**ConfigCliHandler:**
- Added `private profile?: string` field
- Updated constructor to accept `profile?: string` parameter
- Updated `handleConfigCommand()` to accept `profile?: string`
- All `configManager.load()` calls now pass `{ profile: this.profile }`

**ProfileCliHandler:**
- Updated `handleProfileCommand()` signature to accept `profile?: string` (for API consistency)
- Profile commands operate on registry, so parameter is unused

**MCPCliHandler:**
- Added `private profile?: string` field
- Updated constructor to accept `profile?: string` parameter
- Updated `handleMCPCommand()` to accept `profile?: string`
- Updated `configManager.load()` to pass `{ profile: this.profile }`

**Help text updates:**
- Added profile usage examples to MCP help (`nuvin --profile work mcp add server`)
- Updated CLI help to clarify `--profile` must come before subcommand
