# MCP Integration Plan for Nuvin Agent

## Overview

This document outlines the comprehensive plan for integrating Model Context Protocol (MCP) with the Nuvin Agent LLM system. The integration will enable seamless access to MCP server tools within agent conversations.

## Current State Analysis

The codebase already has **strong MCP foundations** with:
- MCP server configuration UI (`MCPSettings.tsx`)
- Configuration storage (`MCPConfig` interface)
- Basic server management infrastructure

### Existing MCP Configuration Structure
```typescript
export interface MCPConfig {
  id: string;
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  enabled: boolean;
  description?: string;
}
```

## Integration Architecture Plan

### Phase 1: Core MCP Integration (High Priority)

#### 1. MCP Client Implementation
**File**: `src/lib/mcp/mcp-client.ts`

- Create JSON-RPC communication layer with MCP servers
- Implement server discovery, connection, and tool enumeration
- Add proper error handling and reconnection logic
- Support for both stdio and HTTP transport protocols

**Key Features**:
- Connection management and health monitoring
- Tool schema discovery and caching
- Automatic reconnection on failures
- Request/response correlation

#### 2. MCP Tool Bridge
**Files**: 
- `src/lib/mcp/mcp-tool.ts`
- Extended `src/lib/tools/tool-registry.ts`

- Create `MCPTool` wrapper class implementing the existing `Tool` interface
- Map MCP tool schemas to internal tool definitions
- Handle parameter validation and type conversion
- Integrate with existing tool execution pipeline

**Integration Points**:
```typescript
interface MCPTool extends Tool {
  serverId: string;
  mcpSchema: MCPToolSchema;
  execute(params: ToolParams): Promise<ToolResult>;
}
```

#### 3. Agent Integration
**Files**: 
- `src/lib/agents/local-agent.ts`
- `src/lib/tools/tool-integration-service.ts`

- Modify `LocalAgent` to include MCP tools in completion parameters
- Update `ToolIntegrationService` to route MCP tool calls properly
- Ensure MCP tools appear alongside built-in tools in conversations
- Add tool source attribution in responses

### Phase 2: Enhanced Functionality (Medium Priority)

#### 4. Dynamic Tool Loading
**File**: `src/lib/mcp/mcp-manager.ts`

- Implement real-time tool discovery when MCP servers start/stop
- Add tool availability status tracking
- Create tool conflict resolution for duplicate names
- Support for hot-reloading server configurations

**Features**:
- Server lifecycle management (start, stop, restart)
- Tool inventory synchronization
- Conflict resolution strategies
- Status broadcasting to UI components

#### 5. Resource Management
**File**: `src/lib/mcp/mcp-resource-manager.ts`

- Implement MCP resource discovery and access
- Add resource listing and retrieval capabilities
- Integrate resources with agent context building
- Support for resource templates and URIs

#### 6. Improved User Experience
**Files**:
- `src/modules/setting/MCPSettings.tsx` (enhanced)
- `src/components/ToolIndicator.tsx` (new)
- `src/screens/Dashboard/messenger.tsx` (updated)

- Show MCP tool usage in conversation history
- Add MCP server status indicators in settings
- Provide tool source attribution (built-in vs MCP server)
- Real-time server status monitoring

### Phase 3: Production Readiness (Lower Priority)

#### 7. Monitoring & Debugging
**Files**:
- `src/lib/mcp/mcp-logger.ts`
- `src/lib/mcp/mcp-metrics.ts`
- `src/modules/debug/MCPDebugDashboard.tsx`

- Add comprehensive logging for MCP operations
- Create debugging dashboard for MCP server health
- Implement performance metrics and monitoring
- Error tracking and alerting

#### 8. Advanced Features
**Files**:
- `src/lib/mcp/mcp-discovery.ts`
- `src/lib/mcp/mcp-permissions.ts`
- `src/lib/mcp/mcp-analytics.ts`

- Add MCP server auto-discovery mechanisms
- Implement tool permission management
- Create MCP tool usage analytics
- Support for server marketplace/registry

## Implementation Details

### Core Components

#### MCP Client Architecture
```typescript
export class MCPClient {
  private connection: MCPConnection;
  private tools: Map<string, MCPToolSchema> = new Map();
  private resources: Map<string, MCPResourceSchema> = new Map();
  
  async connect(): Promise<void>;
  async discoverTools(): Promise<MCPToolSchema[]>;
  async discoverResources(): Promise<MCPResourceSchema[]>;
  async executeTool(name: string, params: any): Promise<any>;
  async getResource(uri: string): Promise<any>;
}
```

#### Tool Registry Integration
```typescript
export class ToolRegistry {
  private builtInTools: Map<string, Tool> = new Map();
  private mcpTools: Map<string, MCPTool> = new Map();
  
  registerMCPTool(tool: MCPTool): void;
  unregisterMCPTool(serverId: string): void;
  getAllTools(): Tool[];
  getToolsByCategory(category: string): Tool[];
}
```

### Configuration Management

#### Extended MCP Configuration
```typescript
export interface ExtendedMCPConfig extends MCPConfig {
  status: 'connected' | 'disconnected' | 'error' | 'starting';
  lastConnected?: Date;
  toolCount: number;
  resourceCount: number;
  errors?: string[];
}
```

### UI Components

#### MCP Status Indicator
```typescript
interface MCPStatusProps {
  config: ExtendedMCPConfig;
  onRestart: () => void;
  onViewLogs: () => void;
}
```

#### Tool Source Attribution
```typescript
interface ToolExecutionResult {
  result: any;
  source: 'builtin' | 'mcp';
  serverId?: string;
  executionTime: number;
}
```

## Integration Workflow

### 1. Server Startup Sequence
1. Load MCP configurations from user preferences
2. Start enabled MCP servers as child processes
3. Establish JSON-RPC connections
4. Discover and register tools/resources
5. Update UI with server status

### 2. Tool Execution Flow
1. Agent receives tool call from LLM
2. ToolRegistry routes to appropriate handler
3. For MCP tools: validate params and forward to MCP server
4. Execute tool and return formatted result
5. Log execution metrics and update conversation

### 3. Error Handling Strategy
- Connection failures: automatic retry with exponential backoff
- Tool execution errors: graceful degradation with fallbacks
- Server crashes: restart attempts with user notification
- Invalid configurations: validation with helpful error messages

## Testing Strategy

### Unit Tests
- MCP client connection and protocol handling
- Tool registration and execution
- Resource discovery and access
- Error handling scenarios

### Integration Tests
- End-to-end tool execution flow
- Multi-server scenarios
- Connection failure recovery
- Performance under load

### User Acceptance Tests
- MCP server configuration workflow
- Tool availability in conversations
- Server status monitoring
- Error reporting and resolution

## Performance Considerations

### Optimization Targets
- Tool discovery: < 500ms per server
- Tool execution: < 2s timeout with streaming support
- Memory usage: < 50MB per active server
- Startup time: < 1s for server initialization

### Caching Strategy
- Tool schemas cached until server restart
- Resource metadata cached with TTL
- Connection pooling for HTTP transport
- Result caching for expensive operations

## Security Considerations

### Sandboxing
- MCP servers run as separate processes
- Limited file system access
- Network access controls
- Environment variable isolation

### Validation
- Input parameter validation
- Output sanitization
- Schema compliance checking
- Permission-based tool access

## Migration Path

### Phase 1 Rollout
1. Deploy MCP client infrastructure
2. Enable for power users with manual configuration
3. Monitor performance and stability
4. Gather feedback and iterate

### Phase 2 Rollout
1. Add UI enhancements and monitoring
2. Enable for all users with default configs
3. Add marketplace/discovery features
4. Performance optimization

### Phase 3 Rollout
1. Advanced features and analytics
2. Enterprise security features
3. Custom server development tools
4. Community marketplace

This comprehensive plan leverages the existing architecture while adding robust MCP support that will make tools from MCP servers seamlessly available to LLM agents in the Nuvin Agent platform.