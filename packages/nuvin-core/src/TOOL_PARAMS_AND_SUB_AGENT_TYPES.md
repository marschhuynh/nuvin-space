# Tool Parameters and Sub-Agent Types - Centralized in Core

## Overview

Moved tool parameter types and sub-agent state types from `nuvin-cli` to `nuvin-core` for proper type safety and reusability across the codebase.

## Why This Change?

### Problem
- `SubAgentState` was defined in CLI (`nuvin-cli/source/utils/eventProcessor.ts`)
- Tool parameter types were defined in CLI (`nuvin-cli/source/types/tool-arguments.ts`)
- These types should be **core domain concepts**, not UI concerns
- Other consumers (future web UI, API clients) would need to duplicate these types

### Solution
- **Moved `SubAgentState` to `nuvin-core/src/sub-agent-types.ts`**
- **Moved tool parameters to `nuvin-core/src/tools/tool-params.ts`**
- Both are now properly exported from `@nuvin/nuvin-core`

## New Core Types

### 1. Sub-Agent Types (`sub-agent-types.ts`)

```typescript
/**
 * Represents a tool call made by a sub-agent during execution
 */
export type SubAgentToolCall = {
  id: string;
  name: string;
  arguments?: string; // JSON string of arguments
  durationMs?: number;
  status?: 'success' | 'error';
  result?: string; // Tool result content
  metadata?: Record<string, unknown>; // Tool result metadata
};

/**
 * State tracking for a sub-agent execution
 * Used by UIs to display real-time sub-agent activity
 */
export type SubAgentState = {
  agentId: string;
  agentName: string;
  status: 'starting' | 'running' | 'completed';
  toolCalls: SubAgentToolCall[];
  resultMessage?: string;
  totalDurationMs?: number;
  finalStatus?: 'success' | 'error' | 'timeout';
  toolCallMessageId?: string;
  toolCallId?: string;
  metrics?: MetricsSnapshot;
};
```

### 2. Tool Parameter Types (`tools/tool-params.ts`)

All tool parameter types with type guards:

```typescript
export type BashToolArgs = {
  cmd: string;
  cwd?: string;
  timeoutMs?: number;
  description?: string;
};

export type FileReadArgs = {
  path: string;
  lineStart?: number;
  lineEnd?: number;
  description?: string;
};

// ... etc for all 9 tools

export type ToolArguments =
  | BashToolArgs
  | FileReadArgs
  | FileEditArgs
  | FileNewArgs
  | DirLsArgs
  | WebSearchArgs
  | WebFetchArgs
  | TodoWriteArgs
  | AssignTaskArgs
  | Record<string, unknown>;
```

### 3. Type Guards

```typescript
export function parseToolArguments(args: string | unknown): ToolArguments;

export function isBashToolArgs(args: ToolArguments): args is BashToolArgs;
export function isFileReadArgs(args: ToolArguments): args is FileReadArgs;
export function isFileEditArgs(args: ToolArguments): args is FileEditArgs;
export function isFileNewArgs(args: ToolArguments): args is FileNewArgs;
export function isDirLsArgs(args: ToolArguments): args is DirLsArgs;
export function isWebSearchArgs(args: ToolArguments): args is WebSearchArgs;
export function isWebFetchArgs(args: ToolArguments): args is WebFetchArgs;
export function isTodoWriteArgs(args: ToolArguments): args is TodoWriteArgs;
export function isAssignTaskArgs(args: ToolArguments): args is AssignTaskArgs;
```

## Usage

### In CLI Components

**Before:**
```typescript
// Local CLI types
import type { SubAgentState } from '@/utils/eventProcessor.js';
import { parseToolArguments, isBashToolArgs } from '@/types/tool-arguments.js';
```

**After:**
```typescript
// From core package
import {
  type SubAgentState,
  parseToolArguments,
  isBashToolArgs,
  isFileReadArgs,
  // ... etc
} from '@nuvin/nuvin-core';
```

### Type-Safe Tool Argument Parsing

```typescript
import { parseToolArguments, isBashToolArgs } from '@nuvin/nuvin-core';

// In SubAgentActivity component
const args = parseToolArguments(toolCall.arguments);

if (isBashToolArgs(args)) {
  // TypeScript knows: args is BashToolArgs
  console.log(args.cmd);  // Type-safe!
  console.log(args.cwd);  // Type-safe!
}
```

### Sub-Agent State Tracking

```typescript
import type { SubAgentState } from '@nuvin/nuvin-core';

const subAgent: SubAgentState = {
  agentId: 'code-reviewer',
  agentName: 'Code Reviewer',
  status: 'running',
  toolCalls: [
    {
      id: 'tool-1',
      name: 'bash_tool',
      arguments: JSON.stringify({ cmd: 'npm test' }),
      durationMs: 150,
      status: 'success',
    }
  ],
};
```

## Benefits

### 1. Single Source of Truth
- **One definition** of `SubAgentState` used everywhere
- **One definition** of tool parameters used everywhere
- No duplication or drift between CLI and other consumers

### 2. Type Safety Across Boundaries
- Core emits properly typed events
- CLI receives properly typed events
- Future consumers get same type safety

### 3. Better Tooling
- IntelliSense works across packages
- Refactoring updates all consumers
- Breaking changes caught at compile time

### 4. Reusability
- Web UI can import same types
- API clients can use for validation
- Testing utilities share types

### 5. Proper Domain Modeling
- Sub-agent concepts belong in core domain
- Tool parameters are core domain concepts
- UI is just a consumer of core types

## File Structure

### nuvin-core
```
src/
  sub-agent-types.ts         # SubAgentState, SubAgentToolCall
  tools/
    tool-params.ts           # All tool parameter types + type guards
  index.ts                   # Exports everything
```

### nuvin-cli
```
source/
  utils/
    eventProcessor.ts        # Uses SubAgentState from core
  components/
    ToolResultView/
      SubAgentActivity.tsx   # Uses types from core
```

## Type Guard Ordering

Type guards are checked in **most specific to least specific** order:

```typescript
// Most specific first
if (isTodoWriteArgs(args)) { ... }
else if (isAssignTaskArgs(args)) { ... }
else if (isFileEditArgs(args)) { ... }
else if (isFileNewArgs(args)) { ... }
else if (isWebSearchArgs(args)) { ... }
else if (isWebFetchArgs(args)) { ... }
else if (isBashToolArgs(args)) { ... }
else if (isFileReadArgs(args)) { ... }
else if (isDirLsArgs(args)) { ... }  // Least specific (checked last)
```

This prevents `isDirLsArgs` from incorrectly matching `todo_write` arguments.

## Testing

- ✅ All 411 tests passing
- ✅ TypeScript compilation clean in both packages
- ✅ No circular dependencies
- ✅ Proper import/export structure

## Migration Notes

### For External Consumers

If you were previously importing these types from CLI internals (not recommended):

```typescript
// ❌ Old (never should have done this)
import type { SubAgentState } from '@nuvin/nuvin-cli/dist/utils/eventProcessor';

// ✅ New (official API)
import type { SubAgentState } from '@nuvin/nuvin-core';
```

### For Future Development

When adding new tools:

1. Add parameter type to `tools/tool-params.ts`
2. Add type guard function
3. Export from `index.ts`
4. Use in UI with full type safety

---

**Status**: ✅ Fully implemented and tested  
**Architecture**: Improved - proper layering of concerns  
**Type Safety**: 100% - types flow from core to consumers
