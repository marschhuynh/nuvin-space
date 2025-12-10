---
'@nuvin/nuvin-core': major
'@nuvin/nuvin-cli': major
---

# Tool Typing Refactor - Complete Implementation

## Breaking Changes

### 1. ToolExecutionResult is now a Discriminated Union

`ToolExecutionResult` has been converted from a simple type to a discriminated union for better type safety:

```typescript
// Before
type ToolExecutionResult = {
  status: 'success' | 'error';
  type: 'text' | 'json';
  result: string | object;  // No type safety
  metadata?: Record<string, unknown>;
}

// After
type ToolExecutionResult = 
  | { status: 'success'; type: 'text'; result: string; ... }
  | { status: 'success'; type: 'json'; result: Record<string, unknown> | unknown[]; ... }
  | { status: 'error'; type: 'text'; result: string; ... }
```

**Migration**: Replace `typeof result.result === 'string'` checks with `result.type === 'text'`

### 2. DirLsTool Now Returns JSON

`DirLsTool` now returns structured JSON instead of formatted text:

```typescript
// Before (text)
"drwxr-xr-x  4096 Dec 8 16:32 src/"

// After (JSON)
{
  "path": ".",
  "entries": [
    { "name": "src", "type": "directory", "size": 4096, ... }
  ],
  "truncated": false,
  "total": 1
}
```

**Impact**: LLMs can now consume structured data. CLI updated to handle both formats.

### 3. Helper Functions Changed

- Removed: `ok(result)` function
- Added: `okText(result, metadata)` and `okJson(result, metadata)`

```typescript
// Before
return ok("success message", { someData: 123 });

// After
return okText("success message", { someData: 123 });
// or
return okJson({ data: "value" }, { someData: 123 });
```

## New Features

### 1. Tool-Specific Type Guards

All 9 tools now have specific type guards for their results:

```typescript
import {
  isBashSuccess,
  isFileReadSuccess,
  isDirLsSuccess,
  isAssignSuccess,
  // ... etc
} from '@nuvin/nuvin-core';

if (isBashSuccess(result)) {
  // result.metadata has CommandMetadata type
  const exitCode = result.metadata?.code;  // Type-safe!
}
```

### 2. Tool Parameter Types

Added typed parameter definitions for all tools:

```typescript
import {
  type BashToolArgs,
  type FileReadArgs,
  parseToolArguments,
  isBashToolArgs,
} from '@nuvin/nuvin-core';

const args = parseToolArguments(toolCall.arguments);
if (isBashToolArgs(args)) {
  console.log(args.cmd);  // Type-safe!
}
```

### 3. Sub-Agent Types in Core

Moved `SubAgentState` and related types to `@nuvin/nuvin-core`:

```typescript
import { type SubAgentState } from '@nuvin/nuvin-core';
```

### 4. Enhanced Metadata Types

- `CommandMetadata` - For bash tool (cwd, code, signal, etc.)
- `FileMetadata` - For file operations (path, size, timestamps)
- `LineRangeMetadata` - For file read ranges
- `DelegationMetadata` - For sub-agent execution (includes MetricsSnapshot with cost!)

### 5. Metrics Passthrough for Sub-Agents

AssignTool now returns complete metrics including cost tracking:

```typescript
if (isAssignSuccess(result)) {
  const cost = result.metadata.metrics?.totalCost;  // $0.0042
  const tokens = result.metadata.metrics?.totalTokens;  // 850
  const duration = result.metadata.executionTimeMs;  // 2500
}
```

## Improvements

### Type Safety

- ✅ No more `any` or unsafe casts in tool result handling
- ✅ Full TypeScript type narrowing with discriminated unions
- ✅ IntelliSense support for tool-specific metadata
- ✅ Compile-time errors for typos in metadata access

### CLI Enhancements

- Enhanced status messages with rich metadata display:
  - `bash_tool "npm test" (exit 0)` 
  - `file_new "package.json" (1234 bytes)`
  - `web_fetch "https://example.com" (200, 15234 bytes)`
  - `todo_write "Updated (3/5 - 60%)"`
  - `assign_task "Done • 5 tools • 850 tokens • $0.0042 • 2500ms"`

- Sub-agent tool calls now show tool-specific parameters:
  - `✓ bash_tool "npm test" (150ms)`
  - `✓ file_read "src/index.ts (lines 1-50)" (25ms)`
  - `✓ web_search "TypeScript best practices (10 results)" (500ms)`

### Developer Experience

- Type-safe metadata access throughout codebase
- Better error messages with errorReason in metadata
- Comprehensive JSDoc with examples on key tools
- Consistent patterns across all tool implementations

## Files Changed

### Core Package (`@nuvin/nuvin-core`)

**New Files:**
- `src/tools/metadata-types.ts` - Common metadata type definitions
- `src/tools/type-guards.ts` - Generic type guards (isSuccess, isError, etc.)
- `src/tools/tool-type-guards.ts` - Tool-specific type guards
- `src/tools/tool-params.ts` - Tool parameter types and type guards
- `src/sub-agent-types.ts` - Sub-agent state and tool call types

**Modified Files:**
- `src/tools/types.ts` - Discriminated union for ExecResult
- `src/tools/result-helpers.ts` - okText(), okJson(), err() helpers
- `src/ports.ts` - ToolExecutionResult as discriminated union
- `src/orchestrator.ts` - Use type discriminators
- `src/agent-manager.ts` - Capture metrics snapshot
- `src/delegation/DefaultDelegationResultFormatter.ts` - Pass through metrics
- `src/mcp/mcp-tools.ts` - Support discriminated unions
- All 9 tool files - Tool-specific result types and metadata
- `src/index.ts` - Export all new types and helpers

### CLI Package (`@nuvin/nuvin-cli`)

**Modified Files:**
- `source/components/ToolResultView/ToolResultView.tsx` - Use type guards, enhanced status messages
- `source/components/ToolResultView/SubAgentActivity.tsx` - Tool-specific parameter display
- `source/components/ToolResultView/renderers/FileReadRenderer.tsx` - Type guards
- `source/components/ToolResultView/renderers/FileEditRenderer.tsx` - Type guards
- `source/components/ToolResultView/utils.ts` - Type discriminators
- `source/utils/eventProcessor.ts` - Import SubAgentState from core

## Testing

- ✅ All 411 tests passing
- ✅ TypeScript compilation clean (no errors)
- ✅ No regressions in tool execution
- ✅ Full type safety verified

## Documentation

New documentation files:
- `IMPLEMENTATION_STATUS.md` - Phase tracking and verification
- `IMPLEMENTATION_COMPLETE.md` - Complete summary with examples
- `TYPE_GUARD_EXPLANATION.md` - Technical explanation of type system
- `TYPE_SAFE_METADATA_USAGE.md` - CLI usage examples
- `SUB_AGENT_TOOL_RENDERING.md` - Sub-agent display enhancements
- `TOOL_PARAMS_AND_SUB_AGENT_TYPES.md` - Architecture documentation

## Upgrade Guide

### For Tool Result Consumers

```typescript
// ❌ Old
if (typeof result.result === 'string') {
  const content = result.result;
}

// ✅ New
if (result.type === 'text') {
  const content = result.result;  // TypeScript knows it's string
}

// ✅ Better - use type guards
import { isFileReadSuccess } from '@nuvin/nuvin-core';

if (isFileReadSuccess(result)) {
  const content = result.result;  // Fully typed!
  const path = result.metadata?.path;  // Type-safe!
}
```

### For DirLsTool Results

```typescript
// ❌ Old
const lines = result.result.split('\n');  // Parsing text

// ✅ New
if (isDirLsSuccess(result)) {
  const entries = result.result.entries;  // Structured data!
  entries.forEach(entry => {
    console.log(entry.name, entry.type, entry.size);
  });
}
```

### For Tool Implementations

```typescript
// ❌ Old
return ok("Success message", { data: 123 });

// ✅ New - use specific helpers
return okText("Success message", { data: 123 });
// or
return okJson({ items: [...] }, { count: 10 });
```

## Benefits Summary

1. **Type Safety**: 100% type-safe tool result handling
2. **Better DX**: Full IntelliSense and compile-time checks
3. **Observability**: Complete metrics with cost tracking
4. **Maintainability**: Single source of truth for types
5. **Extensibility**: Easy to add new tools with type safety

This is a foundational improvement that enables better tooling, safer code, and improved observability across the entire codebase.
