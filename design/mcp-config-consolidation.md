# MCP Subcommand Design

## Overview

Add `nuvin mcp <command>` subcommand for managing MCP server configurations directly from CLI.

## Command Structure

```bash
nuvin mcp <command> [options]

Commands:
  list                          List all configured MCP servers
  add <name>                    Add a new MCP server
  remove <name>                 Remove an MCP server
  show <name>                   Show server details and tools
  enable <name>                 Enable a server
  disable <name>                Disable a server
  test <name>                   Test connection to a server
  help                          Show help
```

---

## Command Specifications

### `nuvin mcp list`

List all configured MCP servers with status.

```bash
$ nuvin mcp list

MCP Servers:
============
  filesystem    stdio   ✓ enabled   12 tools   prefix: fs_
  github        stdio   ✓ enabled    8 tools   prefix: mcp_github_
  remote-api    http    ✗ disabled   0 tools   prefix: api_

Total: 3 servers (2 enabled)
```

**Options:**
- `--json` - Output as JSON
- `--verbose, -v` - Show full config details

---

### `nuvin mcp add <name>`

Add a new MCP server configuration.

```bash
# Stdio transport (default)
$ nuvin mcp add filesystem --command "npx" --args "-y,@anthropic-ai/mcp-server-filesystem,/home"

# With environment variables
$ nuvin mcp add github --command "npx" --args "-y,@anthropic-ai/mcp-server-github" \
  --env "GITHUB_TOKEN=\${GITHUB_TOKEN}"

# HTTP transport
$ nuvin mcp add remote --transport http --url "https://mcp.example.com/api" \
  --header "Authorization=Bearer \${TOKEN}"

# With custom prefix and timeout
$ nuvin mcp add myserver --command "./server.js" --prefix "my_" --timeout 60000
```

**Options:**
| Flag | Type | Description |
|------|------|-------------|
| `--command` | string | Executable command (required for stdio) |
| `--args` | string | Comma-separated arguments |
| `--env` | string | Environment vars (KEY=VALUE, repeatable) |
| `--transport` | string | Transport type: `stdio` (default) or `http` |
| `--url` | string | Server URL (required for http) |
| `--header` | string | HTTP headers (KEY=VALUE, repeatable) |
| `--prefix` | string | Tool name prefix (default: `mcp_<name>_`) |
| `--timeout` | number | Timeout in ms (default: 120000) |
| `--scope` | string | Config scope: `global` (default) or `local` |
| `--disabled` | boolean | Add server in disabled state |

**Result:**
```yaml
# Added to config.yaml
mcp:
  servers:
    filesystem:
      command: "npx"
      args: ["-y", "@anthropic-ai/mcp-server-filesystem", "/home"]
      prefix: "fs_"
      timeoutMs: 120000
      enabled: true
```

---

### `nuvin mcp remove <name>`

Remove an MCP server configuration.

```bash
$ nuvin mcp remove filesystem
✓ Removed MCP server 'filesystem'

$ nuvin mcp remove nonexistent
✗ Error: MCP server 'nonexistent' not found
```

**Options:**
- `--force, -f` - Skip confirmation
- `--scope` - Config scope: `global` or `local`

---

### `nuvin mcp show <name>`

Show detailed server configuration and available tools.

```bash
$ nuvin mcp show filesystem

MCP Server: filesystem
======================
Status:     ✓ enabled
Transport:  stdio
Command:    npx
Args:       -y @anthropic-ai/mcp-server-filesystem /home
Prefix:     fs_
Timeout:    120000ms

Tools (12):
  1. fs_read_file        Read contents of a file
  2. fs_write_file       Write contents to a file
  3. fs_list_directory   List directory contents
  ...

Allowed Tools: 10/12
  ✓ fs_read_file
  ✓ fs_list_directory
  ✗ fs_write_file (disabled)
  ...
```

**Options:**
- `--json` - Output as JSON
- `--tools-only` - Only show tools list

---

### `nuvin mcp enable <name>` / `nuvin mcp disable <name>`

Enable or disable a server without removing config.

```bash
$ nuvin mcp disable github
✓ Disabled MCP server 'github'

$ nuvin mcp enable github
✓ Enabled MCP server 'github'
```

---

### `nuvin mcp test <name>`

Test connection to an MCP server.

```bash
$ nuvin mcp test filesystem
Testing MCP server 'filesystem'...
  Connecting...     ✓ OK (234ms)
  Listing tools...  ✓ OK (12 tools found)
  Test tool call... ✓ OK

✓ MCP server 'filesystem' is working correctly

$ nuvin mcp test broken-server
Testing MCP server 'broken-server'...
  Connecting...     ✗ FAILED

✗ Error: Connection timed out after 30000ms
  Hint: Check if the command is correct and server is installed
```

**Options:**
- `--timeout` - Override timeout for test
- `--verbose, -v` - Show detailed output

---

## Config Structure

```yaml
# ~/.nuvin-cli/config.yaml
mcp:
  servers:
    filesystem:
      command: "npx"
      args: ["-y", "@anthropic-ai/mcp-server-filesystem", "/home"]
      prefix: "fs_"
      timeoutMs: 120000
      enabled: true
    
    github:
      command: "npx"
      args: ["-y", "@anthropic-ai/mcp-server-github"]
      env:
        GITHUB_TOKEN: "${GITHUB_TOKEN}"
      enabled: true
    
    remote-api:
      transport: "http"
      url: "https://mcp.example.com/api"
      headers:
        Authorization: "Bearer ${MCP_TOKEN}"
      enabled: false

  allowedTools:
    filesystem:
      fs_read_file: true
      fs_write_file: false
    github:
      github_create_issue: true

  defaultTimeoutMs: 120000
```

---

## Implementation

### File: `packages/nuvin-cli/source/config/mcp-handler.ts`

```typescript
import { ConfigManager } from './manager.js';
import type { MCPServerConfig } from './types.js';

export class MCPCliHandler {
  private configManager: ConfigManager;

  constructor() {
    this.configManager = ConfigManager.getInstance();
  }

  async handleMCPCommand(args: string[]): Promise<void> {
    await this.configManager.load();
    
    const [command, ...rest] = args;

    switch (command) {
      case 'list':
        await this.listServers(rest);
        break;
      case 'add':
        await this.addServer(rest[0], rest.slice(1));
        break;
      case 'remove':
        await this.removeServer(rest[0], rest.slice(1));
        break;
      case 'show':
        await this.showServer(rest[0], rest.slice(1));
        break;
      case 'enable':
        await this.setServerEnabled(rest[0], true);
        break;
      case 'disable':
        await this.setServerEnabled(rest[0], false);
        break;
      case 'test':
        await this.testServer(rest[0], rest.slice(1));
        break;
      case 'help':
      case '--help':
      case '-h':
        this.showHelp();
        break;
      default:
        if (!command) {
          this.showHelp();
        } else {
          console.error(`Unknown mcp command: ${command}`);
          this.showHelp();
          process.exit(1);
        }
    }
  }

  private async listServers(options: string[]): Promise<void> {
    const servers = this.configManager.get('mcp.servers') as Record<string, MCPServerConfig> || {};
    const isJson = options.includes('--json');
    
    if (isJson) {
      console.log(JSON.stringify(servers, null, 2));
      return;
    }

    const entries = Object.entries(servers);
    if (entries.length === 0) {
      console.log('\nNo MCP servers configured.');
      console.log('Use `nuvin mcp add <name>` to add a server.\n');
      return;
    }

    console.log('\nMCP Servers:');
    console.log('============');
    
    for (const [name, config] of entries) {
      const transport = config.transport || 'stdio';
      const enabled = config.enabled !== false;
      const status = enabled ? '✓ enabled' : '✗ disabled';
      const prefix = config.prefix || `mcp_${name}_`;
      
      console.log(`  ${name.padEnd(14)} ${transport.padEnd(6)} ${status.padEnd(12)} prefix: ${prefix}`);
    }
    
    const enabledCount = entries.filter(([_, c]) => c.enabled !== false).length;
    console.log(`\nTotal: ${entries.length} servers (${enabledCount} enabled)\n`);
  }

  private async addServer(name: string, options: string[]): Promise<void> {
    if (!name) {
      console.error('Error: Server name is required');
      console.log('Usage: nuvin mcp add <name> --command <cmd> [--args <args>] [options]');
      process.exit(1);
    }

    const existing = this.configManager.get(`mcp.servers.${name}`);
    if (existing) {
      console.error(`Error: MCP server '${name}' already exists`);
      console.log('Use `nuvin mcp remove` first or choose a different name.');
      process.exit(1);
    }

    const config = this.parseServerOptions(options);
    
    // Validate required fields
    if (config.transport === 'http') {
      if (!config.url) {
        console.error('Error: --url is required for HTTP transport');
        process.exit(1);
      }
    } else {
      if (!config.command) {
        console.error('Error: --command is required for stdio transport');
        process.exit(1);
      }
    }

    const scope = options.includes('--local') ? 'local' : 'global';
    await this.configManager.set(`mcp.servers.${name}`, config, scope);
    
    console.log(`✓ Added MCP server '${name}' (${scope} scope)`);
  }

  private parseServerOptions(options: string[]): MCPServerConfig {
    const config: MCPServerConfig = { enabled: true };
    
    for (let i = 0; i < options.length; i++) {
      const flag = options[i];
      const value = options[i + 1];
      
      switch (flag) {
        case '--command':
          config.command = value;
          i++;
          break;
        case '--args':
          config.args = value?.split(',').map(s => s.trim());
          i++;
          break;
        case '--env':
          if (!config.env) config.env = {};
          const [key, val] = value?.split('=') || [];
          if (key) config.env[key] = val || '';
          i++;
          break;
        case '--transport':
          config.transport = value as 'stdio' | 'http';
          i++;
          break;
        case '--url':
          config.url = value;
          config.transport = 'http';
          i++;
          break;
        case '--header':
          if (!config.headers) config.headers = {};
          const [hkey, hval] = value?.split('=') || [];
          if (hkey) config.headers[hkey] = hval || '';
          i++;
          break;
        case '--prefix':
          config.prefix = value;
          i++;
          break;
        case '--timeout':
          config.timeoutMs = parseInt(value || '120000', 10);
          i++;
          break;
        case '--disabled':
          config.enabled = false;
          break;
      }
    }
    
    return config;
  }

  private async removeServer(name: string, options: string[]): Promise<void> {
    if (!name) {
      console.error('Error: Server name is required');
      process.exit(1);
    }

    const existing = this.configManager.get(`mcp.servers.${name}`);
    if (!existing) {
      console.error(`Error: MCP server '${name}' not found`);
      process.exit(1);
    }

    const scope = options.includes('--local') ? 'local' : 'global';
    await this.configManager.delete(`mcp.servers.${name}`, scope);
    
    console.log(`✓ Removed MCP server '${name}'`);
  }

  private async showServer(name: string, options: string[]): Promise<void> {
    if (!name) {
      console.error('Error: Server name is required');
      process.exit(1);
    }

    const config = this.configManager.get(`mcp.servers.${name}`) as MCPServerConfig;
    if (!config) {
      console.error(`Error: MCP server '${name}' not found`);
      process.exit(1);
    }

    if (options.includes('--json')) {
      console.log(JSON.stringify(config, null, 2));
      return;
    }

    const enabled = config.enabled !== false;
    const transport = config.transport || 'stdio';
    
    console.log(`\nMCP Server: ${name}`);
    console.log('='.repeat(name.length + 13));
    console.log(`Status:     ${enabled ? '✓ enabled' : '✗ disabled'}`);
    console.log(`Transport:  ${transport}`);
    
    if (transport === 'http') {
      console.log(`URL:        ${config.url}`);
      if (config.headers) {
        console.log(`Headers:    ${Object.keys(config.headers).join(', ')}`);
      }
    } else {
      console.log(`Command:    ${config.command}`);
      if (config.args?.length) {
        console.log(`Args:       ${config.args.join(' ')}`);
      }
      if (config.env && Object.keys(config.env).length) {
        console.log(`Env:        ${Object.keys(config.env).join(', ')}`);
      }
    }
    
    console.log(`Prefix:     ${config.prefix || `mcp_${name}_`}`);
    console.log(`Timeout:    ${config.timeoutMs || 120000}ms`);
    console.log();
  }

  private async setServerEnabled(name: string, enabled: boolean): Promise<void> {
    if (!name) {
      console.error('Error: Server name is required');
      process.exit(1);
    }

    const existing = this.configManager.get(`mcp.servers.${name}`);
    if (!existing) {
      console.error(`Error: MCP server '${name}' not found`);
      process.exit(1);
    }

    await this.configManager.set(`mcp.servers.${name}.enabled`, enabled, 'global');
    console.log(`✓ ${enabled ? 'Enabled' : 'Disabled'} MCP server '${name}'`);
  }

  private async testServer(name: string, options: string[]): Promise<void> {
    if (!name) {
      console.error('Error: Server name is required');
      process.exit(1);
    }

    const config = this.configManager.get(`mcp.servers.${name}`) as MCPServerConfig;
    if (!config) {
      console.error(`Error: MCP server '${name}' not found`);
      process.exit(1);
    }

    console.log(`Testing MCP server '${name}'...`);
    
    try {
      const { CoreMCPClient } = await import('@nuvin/nuvin-core');
      
      const transport = config.transport || 'stdio';
      let client: InstanceType<typeof CoreMCPClient>;
      
      if (transport === 'http') {
        client = new CoreMCPClient(
          { type: 'http', url: config.url!, headers: config.headers },
          config.timeoutMs || 30000
        );
      } else {
        client = new CoreMCPClient(
          { type: 'stdio', command: config.command!, args: config.args, env: config.env },
          config.timeoutMs || 30000
        );
      }

      process.stdout.write('  Connecting...     ');
      const start = Date.now();
      await client.connect();
      console.log(`✓ OK (${Date.now() - start}ms)`);

      process.stdout.write('  Listing tools...  ');
      const tools = client.getTools();
      console.log(`✓ OK (${tools.length} tools found)`);

      await client.disconnect();
      console.log(`\n✓ MCP server '${name}' is working correctly\n`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log('✗ FAILED');
      console.error(`\n✗ Error: ${message}`);
      process.exit(1);
    }
  }

  private showHelp(): void {
    console.log(`
MCP Server Management Commands

Usage:
  nuvin mcp <command> [options]

Commands:
  list                    List all configured MCP servers
  add <name>              Add a new MCP server
  remove <name>           Remove an MCP server
  show <name>             Show server details
  enable <name>           Enable a server
  disable <name>          Disable a server
  test <name>             Test connection to a server
  help                    Show this help

Add Options (stdio transport):
  --command <cmd>         Executable command (required)
  --args <a,b,c>          Comma-separated arguments
  --env <KEY=VALUE>       Environment variable (repeatable)

Add Options (http transport):
  --url <url>             Server URL (required)
  --header <KEY=VALUE>    HTTP header (repeatable)

Common Add Options:
  --transport <type>      Transport: stdio (default) or http
  --prefix <prefix>       Tool name prefix
  --timeout <ms>          Timeout in milliseconds
  --disabled              Add in disabled state
  --local                 Save to local config (default: global)

Other Options:
  --json                  Output as JSON
  --force, -f             Skip confirmation

Examples:
  nuvin mcp add fs --command "npx" --args "-y,@anthropic-ai/mcp-server-filesystem,/home"
  nuvin mcp add api --url "https://mcp.example.com" --header "Authorization=Bearer token"
  nuvin mcp list --json
  nuvin mcp show fs
  nuvin mcp disable github
  nuvin mcp test fs
  nuvin mcp remove old-server --force
`);
  }
}
```

### Update `cli.tsx`

```typescript
// Add MCP subcommand handling
if (cli.input.length > 0 && cli.input[0] === 'mcp') {
  const { MCPCliHandler } = await import('./config/mcp-handler.js');
  const mcpHandler = new MCPCliHandler();
  const mcpArgs = process.argv.slice(3);
  await mcpHandler.handleMCPCommand(mcpArgs);
  process.exit(0);
}
```

### Update Help Text

```
  MCP Commands
    mcp list                    List configured MCP servers
    mcp add <name> [options]    Add a new MCP server
    mcp remove <name>           Remove an MCP server
    mcp show <name>             Show server details and tools
    mcp enable <name>           Enable a server
    mcp disable <name>          Disable a server
    mcp test <name>             Test server connection
    mcp help                    Show MCP command help
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `source/config/mcp-handler.ts` | **Create** - MCP CLI handler |
| `source/config/types.ts` | **Modify** - Add `enabled` field to MCPServerConfig |
| `source/cli.tsx` | **Modify** - Add mcp subcommand routing, update help |
| `docs/mcp-usage.md` | **Modify** - Document new CLI commands |

---

## Deprecations

Remove after implementing:
- `--mcp-config` CLI flag
- `.nuvin_mcp.json` file support
- `loadMCPConfig()` from nuvin-core
- `mcp.configPath` config field
