---
'@nuvin/nuvin-cli': minor
'@nuvin/nuvin-core': patch
---

**MCP Configuration Consolidation & CLI Commands**

**Breaking Changes:**
- Removed `--mcp-config` CLI flag
- Removed `mcpConfigPath` config field  
- Removed legacy `.nuvin_mcp.json` file support
- MCP config is now consolidated into main CLI config under `mcp.servers`

**New Features:**
- Added `nuvin mcp` subcommand for server management:
  - `nuvin mcp list` - List configured servers
  - `nuvin mcp add <name>` - Add new server via cmdline
  - `nuvin mcp remove <name>` - Remove server
  - `nuvin mcp show <name>` - Display server details  
  - `nuvin mcp enable/disable <name>` - Toggle server status
  - `nuvin mcp test <name>` - Test server connection

**Improvements:**
- Enhanced MCP modal with server enable/disable toggle (Space key)
- Added server reconnection functionality (R key) 
- Better error handling and status display in MCP UI
- Config manager now supports auto scope detection for optimal persistence
- Added atomic file writes and mutex protection for concurrent updates
- Tool permissions now stored in `mcp.allowedTools` config key
- Deprecated MCP config types moved to nuvin-core for backward compatibility
