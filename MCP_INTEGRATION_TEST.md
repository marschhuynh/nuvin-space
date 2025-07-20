# MCP Integration Test Guide

This document provides testing instructions for the MCP integration implementation.

## Implementation Summary

✅ **Completed Components:**
1. **MCP Types & Interfaces** (`src/types/mcp.ts`)
2. **MCP Client** (`src/lib/mcp/mcp-client.ts`)
3. **MCP Tool Wrapper** (`src/lib/mcp/mcp-tool.ts`)
4. **MCP Manager** (`src/lib/mcp/mcp-manager.ts`)
5. **MCP Integration Service** (`src/lib/mcp/mcp-integration.ts`)
6. **Extended Tool Registry** (`src/lib/tools/tool-registry.ts`)
7. **App Integration** (`src/App.tsx`)
8. **Enhanced UI Components** (`src/components/mcp/`, `src/modules/setting/`)
9. **React Hooks** (`src/lib/mcp/hooks/`)

## Architecture Overview

```
User Preferences Store (MCPConfig[])
         ↓
MCP Integration Service (sync configs)
         ↓
MCP Manager (lifecycle management)
         ↓
MCP Client instances (JSON-RPC communication)
         ↓
MCP Tools (wrapped for Tool Registry)
         ↓
Local Agent (uses tools via Tool Registry)
```

## Testing Instructions

### 1. Basic Integration Test

**Check Application Startup:**
1. Start the application
2. Check browser console for MCP initialization logs:
   ```
   MCP tools initialized successfully
   Initializing MCP integration with X servers
   ```

### 2. UI Testing

**Navigate to Settings:**
1. Go to Settings → MCP tab
2. Verify the enhanced MCP interface displays:
   - MCP Overview card with statistics
   - Servers and Tools tabs
   - "No MCP servers configured" message if empty

**Add a Test Server:**
1. Click "Add Server"
2. Fill in test configuration:
   - Name: "Test Server"
   - Command: "echo test"
   - Enable: true
3. Save and verify server appears in list

### 3. Tool Registry Integration Test

**Check Tool Registration:**
Open browser console and run:
```javascript
// Check if MCP tools are being registered
import { toolRegistry } from '@/lib/tools/tool-registry';

// Should show current tool count
console.log('Total tools:', toolRegistry.getToolCount());

// Should show MCP-specific tools
console.log('MCP tools:', toolRegistry.getAllMCPTools());

// Should show MCP server IDs
console.log('MCP servers:', toolRegistry.getMCPServerIds());
```

### 4. Agent Integration Test

**Test in Agent Conversation:**
1. Create/select an agent
2. Enable tools in agent configuration
3. Check that MCP tools appear in available tools list
4. Test tool execution (will depend on actual MCP server)

## Current Limitations & Next Steps

### Transport Implementation Needed
The current MCP client has placeholder implementations for:
- **Stdio transport** (requires process spawning)
- **HTTP transport** (requires WebSocket/SSE)

### Production Considerations
1. **Process Management**: Need actual process spawning for stdio
2. **Error Handling**: Enhanced error recovery and reporting
3. **Security**: Input validation and sandboxing
4. **Performance**: Connection pooling and caching
5. **Monitoring**: Health checks and metrics

## Example MCP Server for Testing

Create a simple test MCP server:

```python
# test_mcp_server.py
import json
import sys

def handle_request(request):
    if request.get('method') == 'initialize':
        return {
            'protocolVersion': '2024-11-05',
            'capabilities': {'tools': {}},
            'serverInfo': {'name': 'test-server', 'version': '1.0.0'}
        }
    elif request.get('method') == 'tools/list':
        return {
            'tools': [{
                'name': 'test_tool',
                'description': 'A test tool',
                'inputSchema': {
                    'type': 'object',
                    'properties': {
                        'message': {'type': 'string', 'description': 'Test message'}
                    }
                }
            }]
        }
    elif request.get('method') == 'tools/call':
        return {
            'content': [{'type': 'text', 'text': 'Tool executed successfully!'}]
        }

if __name__ == '__main__':
    for line in sys.stdin:
        request = json.loads(line)
        response = {
            'jsonrpc': '2.0',
            'id': request.get('id'),
            'result': handle_request(request)
        }
        print(json.dumps(response))
        sys.stdout.flush()
```

**Test Configuration:**
- Command: `python test_mcp_server.py`
- Args: []
- Environment: {}

## Verification Checklist

- [ ] Application starts without errors
- [ ] MCP integration initializes
- [ ] UI shows MCP settings interface
- [ ] Can add/edit/delete MCP server configs
- [ ] Tool registry shows MCP tools
- [ ] Agent can access MCP tools
- [ ] Tool execution works (with actual server)

## Success Indicators

1. **Console logs show successful initialization**
2. **MCP settings UI is functional**
3. **Tool registry contains MCP tools**
4. **No TypeScript compilation errors**
5. **Agent tool selection includes MCP tools**

The implementation provides a complete foundation for MCP integration. The missing pieces (transport implementations) are clearly identified and can be added incrementally based on specific MCP server requirements.