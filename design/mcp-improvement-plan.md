# MCP Integration Improvement Plan

## Current State Analysis

### Strengths
1. **Multi-transport support** - Both stdio and HTTP transports
2. **Multi-server management** - Can connect to multiple MCP servers simultaneously
3. **Tool permission system** - Per-tool enable/disable with persistence
4. **Profile integration** - MCP configs can be profile-specific
5. **Inline config support** - Config can be embedded in nuvin.yaml
6. **Timeout handling** - Configurable timeouts per server
7. **Error resilience** - Failed servers don't block other servers

### Weaknesses
1. **No dynamic server management** - Can't add/remove servers at runtime
2. **No reconnection logic** - Failed connections stay failed
3. **Limited error visibility** - Errors only shown in `/mcp` modal
4. **No tool schema display** - Users can't see tool parameters/descriptions
5. **No connection status indicator** - Main UI doesn't show MCP status
6. **No resource/prompt support** - Only tools are exposed from MCP
7. **Missing SSE transport** - Only stdio and HTTP, no SSE for long-polling

---

## Improvement Roadmap

### Phase 1: Reliability & Observability (High Priority)

#### 1.1 Connection Health Monitor
- Periodic health checks for connected servers
- Auto-reconnection with exponential backoff
- Connection state machine: `connecting` → `connected` → `disconnected` → `reconnecting`

```typescript
interface MCPConnectionHealth {
  serverId: string;
  status: 'healthy' | 'degraded' | 'disconnected';
  lastPing: number;
  latencyMs: number;
  reconnectAttempts: number;
}
```

#### 1.2 Status Bar Integration
- Add MCP indicator to CLI header/footer
- Show: connected servers count, failed servers, tool count
- Quick status: `MCP: 3/4 servers • 42 tools`

#### 1.3 Enhanced Error Reporting
- Surface MCP errors in main chat display (not just modal)
- Structured error types for better handling
- Error recovery suggestions

### Phase 2: User Experience (Medium Priority)

#### 2.1 Tool Discovery UI
- Show tool descriptions and parameter schemas in `/mcp` modal
- Search/filter tools by name or description
- Tool usage examples from schema

```
/mcp tools [server-id] [tool-name]  # Show tool details
```

#### 2.2 Runtime Server Management
- Add/remove servers without restart
- `/mcp add <server-id> <command> [args...]`
- `/mcp remove <server-id>`
- `/mcp restart <server-id>`

#### 2.3 Improved Configuration UX
- `/mcp init` - Interactive setup wizard
- Auto-detect common MCP servers (filesystem, memory, etc.)
- Config validation with helpful error messages

### Phase 3: Advanced Features (Lower Priority)

#### 3.1 MCP Resources Support
- Expose `resources/list` and `resources/read` from MCP
- Enable AI to access MCP-provided resources
- Resource caching strategy

#### 3.2 MCP Prompts Support
- Expose `prompts/list` and `prompts/get` from MCP
- Allow users to use MCP-provided prompts
- Prompt parameter handling

#### 3.3 SSE Transport
- Implement Server-Sent Events transport
- Better for web-based MCP servers
- Long-polling support

#### 3.4 Tool Execution Sandboxing
- Per-server execution context isolation
- Resource limits (memory, time)
- Network access controls

### Phase 4: Developer Experience

#### 4.1 MCP Server Development Mode
- Hot-reload for local MCP server development
- Detailed request/response logging
- Performance profiling

```bash
nuvin --mcp-dev ./my-server.js
```

#### 4.2 Testing Utilities
- Mock MCP server for testing
- Tool execution recording/playback
- Integration test helpers

#### 4.3 Documentation Generation
- Auto-generate tool documentation from schemas
- Export OpenAPI-compatible specs
- Tool usage analytics

---

## Implementation Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Connection health monitor | High | Medium | P1 |
| Status bar integration | Medium | Low | P1 |
| Enhanced error reporting | High | Low | P1 |
| Tool discovery UI | High | Medium | P2 |
| Runtime server management | Medium | High | P2 |
| Config wizard | Medium | Medium | P2 |
| Resources support | Medium | High | P3 |
| Prompts support | Low | Medium | P3 |
| SSE transport | Low | Medium | P3 |
| Dev mode | Low | High | P4 |

---

## Technical Debt

1. **MCPServerManager complexity** - Consider splitting into:
   - `MCPConnectionManager` - Connection lifecycle
   - `MCPToolRegistry` - Tool management
   - `MCPConfigLoader` - Config handling

2. **Event bus coupling** - MCP events tightly coupled to UI events
   - Create dedicated MCP event types
   - Separate MCP domain events from UI events

3. **Test coverage** - Add tests for:
   - `MCPToolPort.executeToolCalls()` with various scenarios
   - Connection error handling
   - Config loading edge cases

4. **Type safety** - Strengthen types:
   - Replace `Record<string, unknown>` with proper schemas
   - Use discriminated unions for transport configs

---

## Quick Wins (Can Implement Now)

1. **Add `/mcp status` command** - Show quick server status without modal
2. **Log MCP errors to chat** - Surface connection/execution errors
3. **Add tool count to `/mcp` modal title** - Better at-a-glance info
4. **Validate config on load** - Early feedback for misconfigurations
5. **Add `--mcp-verbose` flag** - Enable detailed MCP logging

---

## Notes

- MCP specification: https://modelcontextprotocol.io/specification
- Current SDK: `@modelcontextprotocol/sdk`
- Consider supporting MCP server discovery protocols in future
