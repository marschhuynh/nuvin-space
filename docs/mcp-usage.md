# MCP (Model Context Protocol) Integration - Usage Guide

## Overview

Nuvin CLI integrates with MCP servers to extend AI capabilities through external tools. MCP servers can be configured via JSON/YAML files or inline configuration.

## Configuration

### Configuration File Locations

1. **Default global config**: `~/.nuvin-cli/.nuvin_mcp.json`
2. **CLI flag**: `--mcp-config <path>`
3. **Inline in nuvin config**: via `mcp.servers` field
4. **Profile-specific**: Each profile can have its own MCP config

### Configuration Format

```json
{
  "mcpServers": {
    "server-id": {
      "command": "/path/to/server",
      "args": ["--arg1", "value"],
      "env": {
        "ENV_VAR": "value"
      },
      "prefix": "mcp_custom_",
      "timeoutMs": 120000
    }
  }
}
```

### Supported Transports

#### 1. Stdio Transport (default)
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-filesystem", "/path/to/allowed"],
      "env": {}
    }
  }
}
```

#### 2. HTTP Transport
```json
{
  "mcpServers": {
    "remote-server": {
      "transport": "http",
      "url": "https://mcp-server.example.com/api",
      "headers": {
        "Authorization": "Bearer <token>"
      }
    }
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `command` | string | - | Executable command (stdio transport) |
| `args` | string[] | [] | Command arguments |
| `env` | object | {} | Environment variables |
| `transport` | 'stdio' \| 'http' | 'stdio' | Transport type |
| `url` | string | - | Server URL (http transport) |
| `headers` | object | {} | HTTP headers (http transport) |
| `prefix` | string | `mcp_<serverId>_` | Tool name prefix |
| `timeoutMs` | number | 120000 | Operation timeout (ms) |

### Inline Configuration (nuvin.yaml/nuvin.json)

```yaml
mcp:
  configPath: "./custom-mcp.json"  # or use inline servers
  servers:
    my-server:
      command: "npx"
      args: ["-y", "my-mcp-server"]
```

## CLI Usage

### Starting with MCP

```bash
# Use default config (~/.nuvin-cli/.nuvin_mcp.json)
nuvin

# Use custom config file
nuvin --mcp-config ./project-mcp.json

# Use profile with MCP config
nuvin --profile development
```

### MCP Server Management UI

Access via `/mcp` command in the CLI:

```
/mcp
```

**Keyboard Controls:**
- `↑↓` - Navigate items
- `←→` or `Tab` - Switch between Servers/Tools panels
- `Space` or `Enter` - Toggle tool permission
- `A` - Enable all tools for selected server
- `D` - Disable all tools for selected server
- `ESC` - Back/Exit

### Tool Permission Management

Tool permissions are stored in the global config (`mcpAllowedTools`) and persist across sessions:

```json
{
  "mcpAllowedTools": {
    "server-id": {
      "tool-name-1": true,
      "tool-name-2": false
    }
  }
}
```

## Architecture

### Core Components

```
packages/nuvin-core/src/
├── mcp/
│   ├── index.ts           # Exports CoreMCPClient, MCPToolPort
│   ├── mcp-client.ts      # Low-level MCP SDK wrapper
│   └── mcp-tools.ts       # ToolPort adapter for MCP tools
├── config.ts              # MCPConfig types and loadMCPConfig()
└── ports.ts               # ToolPort interface

packages/nuvin-cli/source/
├── services/
│   ├── MCPServerManager.ts    # Multi-server management
│   └── OrchestratorManager.ts # Integrates MCP into orchestrator
├── components/
│   ├── MCPModal.tsx           # Server/tool configuration UI
│   ├── MCPServerItem.tsx      # Server list item component
│   └── MCPToolItem.tsx        # Tool list item component
└── modules/commands/definitions/
    └── mcp.tsx                # /mcp command handler
```

### Data Flow

```
1. Config Loading (cli.tsx)
   ├─> loadMCPConfig() from nuvin-core
   ├─> resolveMCPDefinition() for inline configs
   └─> Profile-specific MCP configs

2. Server Initialization (OrchestratorManager)
   ├─> MCPServerManager.initializeServers()
   ├─> CoreMCPClient.connect() for each server
   └─> MCPToolPort.init() exposes tools

3. Tool Execution (during chat)
   ├─> Orchestrator receives tool call
   ├─> MCPToolPort.executeToolCalls()
   └─> CoreMCPClient.callTool() → MCP server
```

## Troubleshooting

### Common Issues

1. **Server fails to connect**
   - Check command path exists and is executable
   - Verify environment variables are set correctly
   - Increase `timeoutMs` for slow-starting servers

2. **Tools not appearing**
   - Check tool permissions in `/mcp` modal
   - Verify server status is "connected"
   - Check server logs for initialization errors

3. **Tool execution timeout**
   - Increase `timeoutMs` in server config
   - Check MCP server logs for errors

### Debugging

Enable verbose logging:
```bash
DEBUG=mcp:* nuvin
```

Check server status:
```
/mcp  # Shows connected/failed status and error messages
```

## Examples

### File System Access
```json
{
  "mcpServers": {
    "fs": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-filesystem", "/Users/me/projects"],
      "prefix": "fs_"
    }
  }
}
```

### GitHub Integration
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

### Multiple Servers
```json
{
  "mcpServers": {
    "fs": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-filesystem", "/home"],
      "timeoutMs": 30000
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-memory"],
      "prefix": "mem_"
    }
  }
}
```
