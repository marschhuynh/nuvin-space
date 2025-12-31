# Tool Call Schema Validation Implementation Summary

## Overview
Implemented comprehensive tool call schema validation using **zod** for all built-in tools and MCP tools.

## Changes Made

### 1. Dependencies Added
- `zod@4.2.1` - Runtime type validation library
- `json-zodify@1.0.2` - JSON Schema to Zod converter

### 2. Core Changes

#### Added `ValidationFailed` Error Reason
**File:** `packages/nuvin-core/src/ports.ts`

```typescript
export enum ErrorReason {
  // ... existing reasons
  ValidationFailed = 'validation_failed',  // NEW
  // ...
}
```

#### Refactored Tool Validators to Use Zod
**File:** `packages/nuvin-core/src/tools/tool-validators.ts`

Created zod schemas for all tools:
- `bashToolSchema` - Validates cmd (string), cwd, timeoutMs, description
- `fileReadSchema` - Validates path, lineStart, lineEnd, description
- `fileEditSchema` - Validates file_path, old_text, new_text, dry_run, description
- `fileNewSchema` - Validates file_path, content, description
- `lsToolSchema` - Validates path, limit, description
- `webSearchSchema` - Validates query (string), count (1-50), offset, domains, etc.
- `webFetchSchema` - Validates url (URL format), description
- `todoWriteSchema` - Validates todos array (with nested validation), description
- `assignTaskSchema` - Validates agent, task, description (all required strings)
- **`globToolSchema`** - NEW: Validates pattern, path, description
- **`grepToolSchema`** - NEW: Validates pattern, path, include, description

Added `validateToolParams()` function using zod's `safeParse()` for type-safe validation.

#### Added MCP Tool Schema Validation
**File:** `packages/nuvin-core/src/mcp/mcp-tools.ts`

- Added `zodSchemas` cache to store converted Zod schemas
- Updated `init()` to convert JSON Schema → Zod using `jsonSchemaToZod()`
- Updated `executeToolCalls()` to validate parameters before calling MCP server
- Returns error with `ErrorReason.ValidationFailed` on validation failure

#### Enhanced Tool Call Converter
**File:** `packages/nuvin-core/src/tools/tool-call-converter.ts`

Added types:
- `ValidationError` - Represents validation errors with errorType
- `ToolCallConversionResult` - Structured result with errors array

Added functions:
- `convertToolCallsWithErrorHandling()` - Returns both valid invocations and validation errors
- Added tool availability checking via `availableTools` parameter

#### Updated Orchestrator
**File:** `packages/nuvin-core/src/orchestrator.ts`

- Added `getAvailableToolNames()` method to get enabled tools
- Updated tool call processing to use `convertToolCallsWithErrorHandling()`
- Returns error results for invalid tool calls
- Valid tool calls continue to execute normally
- Logs validation errors for debugging

#### Exported New Types and Functions
**File:** `packages/nuvin-core/src/index.ts`

Exported:
- All zod schemas (`bashToolSchema`, `fileReadSchema`, etc.)
- `validateToolParams` function
- `ToolCallConversionResult` type
- `ValidationError` type
- `convertToolCallsWithErrorHandling` function

### 3. Test Coverage

Created comprehensive tests:

#### Zod Schema Tests
**File:** `packages/nuvin-core/src/tests/tool-validators-zod.test.ts`

Tests:
- ✓ Valid parameters for all tool schemas
- ✓ Invalid parameters with appropriate error messages
- ✓ Zod error formatting
- ✓ validateToolParams for all tools
- ✓ Unknown tool name handling
- ✓ Error path and message formatting

**Coverage:** 23 tests passing

#### MCP Tool Validation Tests
**File:** `packages/nuvin-core/src/tests/mcp-tool-validation.test.ts`

Tests:
- ✓ Validates params against JSON Schema before calling MCP
- ✓ Rejects invalid params with ValidationFailed error
- ✓ Rejects invalid param types with detailed errors
- ✓ Handles JSON Schema conversion errors gracefully
- ✓ Validates params when schema has no properties

**Coverage:** 5 tests passing

## Key Features Implemented

✅ **Don't stop on validation failure**
- Invalid tool calls return error results
- Valid tool calls continue to execute normally
- LLM receives validation errors as tool call results

✅ **Use zod for schema validation**
- All built-in tools use zod schemas
- Type-safe validation at runtime
- Clear, detailed error messages

✅ **Add tool availability checking**
- Checks if requested tool is in enabled tool list
- Returns error for unavailable tools
- Uses `tool_not_found` error type

✅ **MCP tool schema validation**
- Converts JSON Schema to Zod automatically
- Validates before calling MCP server
- Graceful error handling for invalid schemas

✅ **Comprehensive error messages**
- Validation errors include field path and detailed message
- Different error types: `parse`, `validation`, `tool_not_found`
- Error metadata includes `ErrorReason.ValidationFailed`

## Test Results

**Total Tests:** 572 tests passed, 2 skipped
- 557 tests from nuvin-core passing
- 15 tests from nuvin-cli passing
- All new validation tests passing
- 2 tests skipped (pre-existing issue in orchestrator-abort-memory.test.ts)

## Migration Notes

### Breaking Changes
- **Error type changes**: Zod v4 has different error message format than zod v3
  - Error path is now in `issue.path` array
  - Errors are formatted as `"path: message"` instead of standalone messages
- Tests updated to use regex matching for flexibility

### Non-Breaking Changes
- All existing tests continue to pass
- Backward compatible with existing tool implementations
- Default strict validation mode is still `false`

## Benefits

1. **Type Safety**: Zod provides runtime type checking with TypeScript integration
2. **Better Error Messages**: Structured error messages with field paths
3. **No Silent Failures**: Invalid tool calls return explicit errors instead of empty params
4. **MCP Support**: MCP tools now validated before execution
5. **Tool Availability**: Prevents calling non-existent tools
6. **Test Coverage**: Comprehensive test coverage for new validation logic

## File Changes Summary

| File | Lines Changed | Description |
|------|---------------|-------------|
| `ports.ts` | +1 | Added ValidationFailed error reason |
| `tool-validators.ts` | ~120 lines | Complete refactor to zod, added glob_tool and grep_tool |
| `mcp/mcp-tools.ts` | ~160 lines | Added zod schema conversion and validation |
| `tool-call-converter.ts` | ~60 lines | Added error types and convertToolCallsWithErrorHandling |
| `orchestrator.ts` | ~10 lines | Added validation flow with error results |
| `index.ts` | +10 lines | Exported new types and functions |
| `tool-validators-zod.test.ts` | ~160 lines | New comprehensive test file |
| `mcp-tool-validation.test.ts` | ~160 lines | New MCP validation test file |
| `package.json` | +2 lines | Added zod and json-zodify dependencies |

## Next Steps

Optional future enhancements:
1. Add CLI command to test validation behavior
2. Add validation to tool approval UI to show validation status before approval
3. Consider adding stricter validation modes for production
4. Add metrics for validation failures
