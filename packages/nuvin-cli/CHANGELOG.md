# @nuvin/nuvin-cli

## 1.15.2

### Patch Changes

- [`736df32`](https://github.com/marschhuynh/nuvin-space/commit/736df32e6694e2f6c6d337718e5285f8eee67060) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Upgrade nuvin-core

## 1.15.1

### Patch Changes

- [`c558055`](https://github.com/marschhuynh/nuvin-space/commit/c5580551a5aa820a7572341723e83b2217964abb) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Fix render of user message

## 1.15.0

### Minor Changes

- [`f7750f0`](https://github.com/marschhuynh/nuvin-space/commit/f7750f0ccaac9601719b9e7488de945e305f77c1) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Add scroll and auto-scroll UI components, truncateLines utility, demos and tests to improve chat display scrolling behavior.

## 1.14.0

### Minor Changes

- [`2bbcbb1`](https://github.com/marschhuynh/nuvin-space/commit/2bbcbb1288d7daf958ff565096ab001dc4834c2f) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Major UI/UX improvements and tool system refactoring

  ### Tool Registry System

  - Added centralized tool registry for managing tool metadata, display names, status strategies, parameter renderers, and collapse behavior
  - Eliminates scattered tool name mapping and provides single source of truth
  - Supports extensibility for new tools and consistent behavior across the application

  ### Enhanced Tool Approval Flow

  - Integrated proper denied tool handling with visual feedback
  - Added `isAwaitingApproval` state for better user experience
  - Enhanced error categorization with `ErrorReason.Denied`
  - Improved tool result event emission for denied operations

  ### Component Architecture Improvements

  - **BaseRenderer**: Created reusable base component for tool result rendering with configurable truncation modes
  - **ParamLayout**: Extracted common layout logic for consistent parameter display styling
  - **Constants Centralization**: Added `LAYOUT` and `TRUNCATION` constants for uniform spacing and content limits

  ### UI/UX Enhancements

  - Refined message spacing and visual hierarchy
  - Improved truncation behavior for different content types (head vs tail modes)
  - Better visual distinction between tool execution states
  - Consistent border styling and layout across all tool displays

  ### Core Functionality

  - Added streaming support for sub-agent task delegation
  - Made `max_tokens` parameter conditional in LLM API calls for efficiency
  - Enhanced agent template configuration with streaming options

  ### Code Quality

  - Eliminated code duplication across parameter renderers
  - Improved TypeScript interfaces and type safety
  - Better component composition and reusability
  - Enhanced maintainability through centralized configuration

### Patch Changes

- Updated dependencies [[`2bbcbb1`](https://github.com/marschhuynh/nuvin-space/commit/2bbcbb1288d7daf958ff565096ab001dc4834c2f)]:
  - @nuvin/nuvin-core@1.7.0

## 1.13.4

### Patch Changes

- [`14c1a75`](https://github.com/marschhuynh/nuvin-space/commit/14c1a7504e798685d49c461a58115a70ef3186e9) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Fix stale isStreaming flag causing messages to stay dynamic after errors

  - Clear isStreaming flag when error occurs during streaming
  - Add fallback: ignore isStreaming=true if message is not the last non-transient
  - Extract calculateStaticCount to utils/staticCount.ts with tests

## 1.13.3

### Patch Changes

- [`f31947d`](https://github.com/marschhuynh/nuvin-space/commit/f31947db768da35888f1a7fb1c8e912ca150e164) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Fix crash when loading old history files with missing metadata

  - Add `get()` utility for safe nested property access
  - Update ToolResultView to handle missing `metadata.stats` and other optional fields
  - Gracefully degrade display when metadata is incomplete

## 1.13.2

### Patch Changes

- [`6f5ad8d`](https://github.com/marschhuynh/nuvin-space/commit/6f5ad8d79100df0bccf2eae713321c42e457bbe0) Thanks [@marschhuynh](https://github.com/marschhuynh)! - fix(formatters): improve duration formatting for minutes

  - Fix formatDuration to omit "0s" when displaying whole minutes (e.g., "2m" instead of "2m 0s")

- [`6f5ad8d`](https://github.com/marschhuynh/nuvin-space/commit/6f5ad8d79100df0bccf2eae713321c42e457bbe0) Thanks [@marschhuynh](https://github.com/marschhuynh)! - feat(retry): move retry logic to transport layer with exponential backoff

  **Core Changes:**

  - Add `RetryTransport` with exponential backoff and jitter (maxRetries: 10, baseDelay: 1s, maxDelay: 60s)
  - Respects `Retry-After` headers from API responses
  - Configurable callbacks: `onRetry`, `onExhausted`, `shouldRetry`
  - Error classification: retry on 429, 500, 502, 503, 504, network errors, timeouts
  - Add `AbortError` for user-initiated cancellations
  - Export retry utilities: `isRetryableError`, `isRetryableStatusCode`, `calculateBackoff`, `parseRetryAfterHeader`
  - Add `retry?: Partial<RetryConfig>` option to `BaseLLMOptions`
  - `GenericLLM` and `GithubLLM` wrap transports with `RetryTransport` when retry config provided
  - Remove `retry?: boolean` option from `SendMessageOptions`

  **CLI Changes:**

  - Integrate retry configuration into `LLMFactory` with default retry callbacks
  - Show retry notifications in UI with countdown timer
  - Remove application-layer retry logic from `OrchestratorManager.send()`
  - Delete obsolete `retry()` method from OrchestratorManager
  - Deprecate CLI retry utilities (`retry-utils.ts`, `error-classification.ts`)

- [`6f5ad8d`](https://github.com/marschhuynh/nuvin-space/commit/6f5ad8d79100df0bccf2eae713321c42e457bbe0) Thanks [@marschhuynh](https://github.com/marschhuynh)! - feat(ui): improve UI rendering and transient message handling

  - Add `isTransient` metadata flag for temporary system messages (retry notifications)
  - Improve ChatDisplay dynamic rendering: skip transient messages when scanning for pending operations
  - Fix sub-agent activity display: better text wrapping and parameter truncation
  - Enhance tool call duration formatting with `formatDuration()` utility
  - Fix merging logic to always propagate metadata updates (including sub-agent state)

- Updated dependencies [[`6f5ad8d`](https://github.com/marschhuynh/nuvin-space/commit/6f5ad8d79100df0bccf2eae713321c42e457bbe0), [`6f5ad8d`](https://github.com/marschhuynh/nuvin-space/commit/6f5ad8d79100df0bccf2eae713321c42e457bbe0)]:
  - @nuvin/nuvin-core@1.6.1

## 1.13.1

### Patch Changes

- [`b360cc3`](https://github.com/marschhuynh/nuvin-space/commit/b360cc3fef464d8330115d8db1c4e8caab143438) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Refactor: extract formatting utilities into centralized formatters module

  - Add new `formatters.ts` utility module with reusable formatting functions
  - Extract `formatTokens`, `formatDuration`, `formatRelativeTime`, `formatTimeFromSeconds`, `getUsageColor`, and `getMessageCountBadge` from components
  - Improve token formatting to support millions (M) and billions (B) suffixes
  - Add human-readable duration formatting (ms, seconds, minutes)
  - Update Footer, RecentSessions, SubAgentActivity, ToolResultView, and ToolTimer to use centralized formatters

## 1.13.0

### Minor Changes

- [`d896922`](https://github.com/marschhuynh/nuvin-space/commit/d896922e3e4cb6bcc143344574fbd47dd22382d6) Thanks [@marschhuynh](https://github.com/marschhuynh)! - feat: stream sub-agent metrics to UI in real-time

  - Add `SubAgentMetrics` event type to stream metrics during sub-agent execution
  - Create metrics port in AgentManager to emit live metrics (llmCallCount, totalTokens, totalCost)
  - Handle `SubAgentMetrics` event in CLI eventProcessor to update SubAgentState
  - Display live metrics in SubAgentActivity during "Working..." state
  - Show final metrics in ToolResultView when sub-agent completes (calls, tokens, cost, duration)
  - Increase default maxTokens for sub-agents from 4000 to 64000

- [`3f86c26`](https://github.com/marschhuynh/nuvin-space/commit/3f86c268c933589f9609e2bbaae41e369821e556) Thanks [@marschhuynh](https://github.com/marschhuynh)! - # Tool Typing Refactor - Complete Implementation

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
  } from "@nuvin/nuvin-core";

  if (isBashSuccess(result)) {
    // result.metadata has CommandMetadata type
    const exitCode = result.metadata?.code; // Type-safe!
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
  } from "@nuvin/nuvin-core";

  const args = parseToolArguments(toolCall.arguments);
  if (isBashToolArgs(args)) {
    console.log(args.cmd); // Type-safe!
  }
  ```

  ### 3. Sub-Agent Types in Core

  Moved `SubAgentState` and related types to `@nuvin/nuvin-core`:

  ```typescript
  import { type SubAgentState } from "@nuvin/nuvin-core";
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
    const cost = result.metadata.metrics?.totalCost; // $0.0042
    const tokens = result.metadata.metrics?.totalTokens; // 850
    const duration = result.metadata.executionTimeMs; // 2500
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
  if (typeof result.result === "string") {
    const content = result.result;
  }

  // ✅ New
  if (result.type === "text") {
    const content = result.result; // TypeScript knows it's string
  }

  // ✅ Better - use type guards
  import { isFileReadSuccess } from "@nuvin/nuvin-core";

  if (isFileReadSuccess(result)) {
    const content = result.result; // Fully typed!
    const path = result.metadata?.path; // Type-safe!
  }
  ```

  ### For DirLsTool Results

  ```typescript
  // ❌ Old
  const lines = result.result.split("\n"); // Parsing text

  // ✅ New
  if (isDirLsSuccess(result)) {
    const entries = result.result.entries; // Structured data!
    entries.forEach((entry) => {
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

### Patch Changes

- Updated dependencies [[`d896922`](https://github.com/marschhuynh/nuvin-space/commit/d896922e3e4cb6bcc143344574fbd47dd22382d6), [`3f86c26`](https://github.com/marschhuynh/nuvin-space/commit/3f86c268c933589f9609e2bbaae41e369821e556)]:
  - @nuvin/nuvin-core@1.6.0

## 1.12.2

### Patch Changes

- [`49b6608`](https://github.com/marschhuynh/nuvin-space/commit/49b660831f3e71044aede300095ca73cc8a3a630) Thanks [@marschhuynh](https://github.com/marschhuynh)! - UI/UX improvements: Add footer support to AppModal, improve responsive layout with flexWrap for Footer and MessageLine, enhance text wrapping for better terminal display

- Updated dependencies [[`dadaace`](https://github.com/marschhuynh/nuvin-space/commit/dadaace3556ea0c9423aa54b37202b5ac67de533)]:
  - @nuvin/nuvin-core@1.5.2

## 1.12.1

### Patch Changes

- [`b5a0214`](https://github.com/marschhuynh/nuvin-space/commit/b5a0214b6437261edb8c024ed36d44be30a45e87) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Add getModels support for Anthropic provider

  **Core Changes:**

  - Implement `getModels()` method in `AnthropicAISDKLLM` class
  - Fetch models from Anthropic API endpoint: `https://api.anthropic.com/v1/models`
  - Support both API key and OAuth authentication for model fetching
  - Handle OAuth token refresh on 401/403 errors during model listing
  - Add Anthropic case to `normalizeModelLimits()` function
  - Use `display_name` field from API response for Anthropic model names
  - Update fallback limits with all current Claude models (Opus 4.5, Haiku 4.5, Sonnet 4.5, etc.)

  **CLI Changes:**

  - Update `LLMFactory.getModels()` to support Anthropic OAuth credentials
  - Allow model fetching with either API key or OAuth authentication for Anthropic

  **Tests:**

  - Add comprehensive unit tests for getModels functionality
  - Add integration tests for real API calls (skipped without credentials)
  - All existing tests continue to pass

- Updated dependencies [[`b5a0214`](https://github.com/marschhuynh/nuvin-space/commit/b5a0214b6437261edb8c024ed36d44be30a45e87), [`ec26a90`](https://github.com/marschhuynh/nuvin-space/commit/ec26a9092e872ca0ee2769e04047936a9045a652)]:
  - @nuvin/nuvin-core@1.5.0

## 1.12.0

### Minor Changes

- [`7e9140f`](https://github.com/marschhuynh/nuvin-space/commit/7e9140f306fa1a68bb50474003d58bcf561d15c8) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Refactor /new and /summary commands to preserve session history

  **Session Management:**

  - `/new` command now creates new session via `OrchestratorManager.createNewConversation()`
  - Replace `ui:new:conversation` event with `conversation:created` event
  - `ToolApprovalContext` listens to `conversation:created` to clear session-approved tools

  **Auto-Summary & /summary Refactoring:**

  - Auto-summary (at 95% context window) now creates a new session instead of replacing memory in-place
  - `/summary` and `/summary beta` commands create new sessions with summary, preserving original
  - Add `summarizedFrom` field to `ConversationMetadata` to track session lineage
  - Add `summarizeAndCreateNewSession()` and `compressAndCreateNewSession()` methods to share logic

  **Test Fixes:**

  - Fix `commands.test.ts`: use `vi.hoisted()` for proper mock hoisting
  - Fix `context-window-auto-summary.test.ts`: update constructor call, fix types
  - Apply biome formatting to all test files

- [`8168642`](https://github.com/marschhuynh/nuvin-space/commit/8168642871eea28f657f2c25a4550b497806dbbd) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Add input history navigation with up/down arrow keys

  - Press ↑/↓ to recall previously submitted messages
  - Loads history from memory on startup, with fallback to last session's message
  - Multi-line input requires double-press at first/last line to navigate history
  - Extracts history logic into reusable `useInputHistory` hook

### Patch Changes

- Updated dependencies [[`7e9140f`](https://github.com/marschhuynh/nuvin-space/commit/7e9140f306fa1a68bb50474003d58bcf561d15c8)]:
  - @nuvin/nuvin-core@1.4.4

## 1.11.3

### Patch Changes

- [`6b0cf9c`](https://github.com/marschhuynh/nuvin-space/commit/6b0cf9c29b3c3ffe1b6d77c43a0064da4fae9436) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Fix publish failure by skipping redundant type check during prepack

## 1.11.2

### Patch Changes

- [`e59a2c5`](https://github.com/marschhuynh/nuvin-space/commit/e59a2c5e5e9fd1c39c553e2d6c814063070c6feb) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Refactor project structure: move all source files into `src/` directory for better organization and standard TypeScript project layout

- Updated dependencies [[`e59a2c5`](https://github.com/marschhuynh/nuvin-space/commit/e59a2c5e5e9fd1c39c553e2d6c814063070c6feb)]:
  - @nuvin/nuvin-core@1.4.3

## 1.11.1

### Patch Changes

- [`239c907`](https://github.com/marschhuynh/nuvin-space/commit/239c9073545c42b1ed4c9341f15a6a9ad9bc943f) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Update dependencies to latest versions

- Updated dependencies [[`239c907`](https://github.com/marschhuynh/nuvin-space/commit/239c9073545c42b1ed4c9341f15a6a9ad9bc943f)]:
  - @nuvin/nuvin-core@1.4.2

## 1.11.0

### Minor Changes

- [`391fee8`](https://github.com/marschhuynh/nuvin-space/commit/391fee8b38db2ea04869f236f9ff65ab02ac3192) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Implement seamless authentication and model selection navigation flow

  ### Features

  - **Interactive Auth Navigation Prompt**: Replace text-based Y/n prompt with styled interactive buttons matching tool approval modal design

    - Tab/Arrow keys to navigate between Yes/No options
    - Enter to select, or quick shortcuts (1/Y for Yes, 2/N for No)
    - Visual feedback with colored buttons and arrow indicator

  - **Smart Model Selection UI**: Hide custom model input option when provider is not configured

    - Prevents confusing UX when authentication is required
    - Shows only the auth navigation prompt when provider needs configuration

  - **Automatic Round-Trip Navigation**: Seamlessly return to model selection after successful authentication

    - `/model` → Select unconfigured provider → Navigate to `/auth` → Configure auth → **Automatically return to `/model`**
    - Provider context preserved throughout the flow
    - Eliminates manual navigation steps

  - **Enhanced Error Detection**: Trigger auth navigation prompt for both LLMFactory and configuration errors
    - Detects authentication errors during model fetching
    - Shows navigation prompt for "not configured" or "/auth" error messages

  ### User Experience Improvements

  - Reduced manual steps from 8 to 5 (3 steps eliminated)
  - 60% reduction in user effort for initial provider setup
  - Consistent UI patterns across authentication flows
  - Clear visual feedback for all interactive elements

  ### Technical Changes

  - Added `--return-to-model` flag to `/auth` command for return navigation
  - Enhanced `AuthNavigationPrompt` component with keyboard navigation
  - Updated `useModelsCommandState` to detect auth errors from multiple sources
  - Improved state management for auth prompt display

### Patch Changes

- [`c2c485a`](https://github.com/marschhuynh/nuvin-space/commit/c2c485a737a3e063eb09fcdf4f22b10f5b2a4028) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Fix text rendering and wrapping issues

  - Fixed unicode character width calculations using string-width library
  - Improved text reflow algorithm to properly handle indentation and ANSI codes
  - Fixed input submission to preserve whitespace (don't trim user input)
  - Added wrap="end" to Markdown component for better text wrapping
  - Enabled markdown rendering for streaming content in MessageLine
  - Added comprehensive text reflow tests

## 1.10.2

### Patch Changes

- [`9480dcd`](https://github.com/marschhuynh/nuvin-space/commit/9480dcd7025ff720702e60f3e805e6c9c62246bd) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Update logo

## 1.10.1

### Patch Changes

- [`6a41065`](https://github.com/marschhuynh/nuvin-space/commit/6a410656e38d5b5020c42e5b94bc83e0ab7900d3) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Update logger level to error for better log management and reduced noise

- Updated dependencies [[`6a41065`](https://github.com/marschhuynh/nuvin-space/commit/6a410656e38d5b5020c42e5b94bc83e0ab7900d3)]:
  - @nuvin/nuvin-core@1.4.1

## 1.10.0

### Minor Changes

- [`2a2ab84`](https://github.com/marschhuynh/nuvin-space/commit/2a2ab8483149e4f1ce56473bb4b40bcd7144b979) Thanks [@marschhuynh](https://github.com/marschhuynh)! - feat(cli): enhance authentication flow with notifications

  - Add success notification when API key is saved in auth flow
  - Improve provider selection UI in InitialConfigSetup
  - Handle edge case when no providers are available
  - Enhance auth command with automatic deactivation on success
  - Add better error handling and user feedback

- [`2a2ab84`](https://github.com/marschhuynh/nuvin-space/commit/2a2ab8483149e4f1ce56473bb4b40bcd7144b979) Thanks [@marschhuynh](https://github.com/marschhuynh)! - refactor(core/cli): migrate to dynamic provider discovery

  - Replace static provider lists with dynamic discovery from core
  - Add getProviderLabel() to core for centralized label management
  - Update provider config schema: name → key field with optional label
  - Enhance InitialConfigSetup to use available providers dynamically
  - Remove hardcoded PROVIDER\_\* constants in favor of runtime discovery

- [`2a2ab84`](https://github.com/marschhuynh/nuvin-space/commit/2a2ab8483149e4f1ce56473bb4b40bcd7144b979) Thanks [@marschhuynh](https://github.com/marschhuynh)! - feat(cli): improve provider and model selection UX

  - Display provider labels instead of provider keys in UI components
  - Add fallback text for undefined provider information
  - Improve model loading and custom model input screens
  - Enhance provider descriptions and selection behavior
  - Update models command to use dynamic provider discovery

### Patch Changes

- [`2a2ab84`](https://github.com/marschhuynh/nuvin-space/commit/2a2ab8483149e4f1ce56473bb4b40bcd7144b979) Thanks [@marschhuynh](https://github.com/marschhuynh)! - chore(cli): improve error messages and enable debug logging

  - Add "wait a moment" context to orchestrator initialization errors
  - Enable debug level logging in file logger by default
  - Provide more descriptive error messages in command flows
  - Improve error feedback in history and summary commands

- [`2a2ab84`](https://github.com/marschhuynh/nuvin-space/commit/2a2ab8483149e4f1ce56473bb4b40bcd7144b979) Thanks [@marschhuynh](https://github.com/marschhuynh)! - test(cli): remove outdated test and update imports

  - Delete provider-registry.test.ts (no longer relevant with dynamic providers)
  - Update stripAnsi and textInputPaste test imports to use core package
  - Remove hardcoded provider assertion tests that don't apply to dynamic system

- [`2a2ab84`](https://github.com/marschhuynh/nuvin-space/commit/2a2ab8483149e4f1ce56473bb4b40bcd7144b979) Thanks [@marschhuynh](https://github.com/marschhuynh)! - refactor(core/cli): move string utilities to core package

  - Remove CLI utils.ts wrapper file
  - Update imports to use @nuvin/nuvin-core utilities directly
  - Move stripAnsiAndControls and canonicalizeTerminalPaste to core exports
  - Update test imports to reference core package utilities
  - Ensure consistent utility usage across packages

- Updated dependencies [[`2a2ab84`](https://github.com/marschhuynh/nuvin-space/commit/2a2ab8483149e4f1ce56473bb4b40bcd7144b979), [`2a2ab84`](https://github.com/marschhuynh/nuvin-space/commit/2a2ab8483149e4f1ce56473bb4b40bcd7144b979)]:
  - @nuvin/nuvin-core@1.4.0

## 1.9.3

### Patch Changes

- [`5b164c5`](https://github.com/marschhuynh/nuvin-space/commit/5b164c5215070d7b2fa1429bddf5bbfbf938832a) Thanks [@marschhuynh](https://github.com/marschhuynh)! - - Support kimi coding

- Updated dependencies [[`5b164c5`](https://github.com/marschhuynh/nuvin-space/commit/5b164c5215070d7b2fa1429bddf5bbfbf938832a)]:
  - @nuvin/nuvin-core@1.3.2

## 1.9.2

### Patch Changes

- [`a9742e0`](https://github.com/marschhuynh/nuvin-space/commit/a9742e07131afeae5b4c7da44074337b941666d0) Thanks [@marschhuynh](https://github.com/marschhuynh)! - - Support kimi coding

## 1.9.1

### Patch Changes

- [`2663741`](https://github.com/marschhuynh/nuvin-space/commit/2663741c5660cd631559722c0505ab88bd57df85) Thanks [@marschhuynh](https://github.com/marschhuynh)! - - Fix duplicate logo and RecentSessions rendering during streaming
  - Consolidate RecentSessions inside WelcomeLogo component for simpler rendering

## 1.9.0

### Minor Changes

- [`7bb25af`](https://github.com/marschhuynh/nuvin-space/commit/7bb25af570fbbed6b753cbf7c382da84e68bcf2e) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Refactor session metrics and orchestrator architecture

  - Move metrics tracking to dedicated port in orchestrator
  - Add model limits support for context window management
  - Simplify orchestrator dependency injection with optional deps
  - Remove deprecated setMemory() from CommandRegistry
  - Fix all related tests

- [`459c879`](https://github.com/marschhuynh/nuvin-space/commit/459c8797169fa59b7d9186baf216c131d8f182d4) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Refactor session metrics to be session-oriented

  - **Breaking**: Remove `SessionMetricsTracker` from `@nuvin/nuvin-core` (unused)
  - **Breaking**: `SessionMetricsService` methods now require explicit `conversationId` parameter
  - Add `SessionBoundMetricsPort` adapter to bind metrics to specific sessions
  - Fix `contextWindowUsage` not displaying - now correctly tracks and displays percentage in Footer
  - Update subscriber callback to include `conversationId` for filtering
  - Ensure all metrics operations use consistent session ID
  - Update command handlers (`/clear`, `/new`, `/summary`) to pass session ID explicitly

### Patch Changes

- Updated dependencies [[`7bb25af`](https://github.com/marschhuynh/nuvin-space/commit/7bb25af570fbbed6b753cbf7c382da84e68bcf2e), [`459c879`](https://github.com/marschhuynh/nuvin-space/commit/459c8797169fa59b7d9186baf216c131d8f182d4)]:
  - @nuvin/nuvin-core@1.3.0

## 1.8.0

### Minor Changes

- [`e400bb9`](https://github.com/marschhuynh/nuvin-space/commit/e400bb955dde2834344002ec9f9746ce5698ac6a) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Add notification-based update system with lifecycle callbacks

  The update checker now runs after app startup and communicates via notifications:

  - Update checks run 2 seconds after app starts (non-blocking)
  - Shows notifications for update availability, start, and completion
  - Added UpdateCheckOptions interface with lifecycle callbacks
  - Improved UX by not blocking app startup for update checks

### Patch Changes

- [`e400bb9`](https://github.com/marschhuynh/nuvin-space/commit/e400bb955dde2834344002ec9f9746ce5698ac6a) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Update CLI branding from 'nuvin-cli' to 'nuvin'

  - Update profile command help text to use 'nuvin' command name
  - Update documentation with consistent branding
  - Improve user-facing documentation clarity

- [`e400bb9`](https://github.com/marschhuynh/nuvin-space/commit/e400bb955dde2834344002ec9f9746ce5698ac6a) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Validate provider authentication in models command

  - Check provider auth configuration before allowing model selection
  - Show helpful error message prompting users to run /auth if provider not configured
  - Prevent saving invalid provider/model configurations
  - Fix isActive prop forwarding in ModelsCommandComponent

- [`e400bb9`](https://github.com/marschhuynh/nuvin-space/commit/e400bb955dde2834344002ec9f9746ce5698ac6a) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Fix ComboBox rendering and config profile tracking

  - Fix ComboBox selection index reset behavior to prevent unnecessary re-renders
  - Ensure current profile is properly tracked when using CLI flag overrides
  - Improve component stability and config state management

## 1.7.6

### Patch Changes

- [`32981d9`](https://github.com/marschhuynh/nuvin-space/commit/32981d9c3e17244570c3e1fc4657ded958a312f9) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Improve diff view and tool content rendering

  - Refactor FileDiffView to use flex wrapping for better long-line handling
  - Replace Markdown with plain text for file_new tool content and streaming messages
  - Clean up RecentSessions styling with underline title
  - Remove unused isInitialMountRef from app.tsx
  - Update snapshots for new diff line format

## 1.7.5

### Patch Changes

- [`1d4e161`](https://github.com/marschhuynh/nuvin-space/commit/1d4e161958837812687fbc7a6d5b0bd5f880ef32) Thanks [@marschhuynh](https://github.com/marschhuynh)! - fix: override ink

## 1.7.4

### Patch Changes

- [`74a6448`](https://github.com/marschhuynh/nuvin-space/commit/74a64481be9c064695ee96bc46926d7afd915f23) Thanks [@marschhuynh](https://github.com/marschhuynh)! - fix: override ink

## 1.7.3

### Patch Changes

- [`ed48791`](https://github.com/marschhuynh/nuvin-space/commit/ed48791da752bc1c6dd16d5df00ebd32156404ee) Thanks [@marschhuynh](https://github.com/marschhuynh)! - fix: override ink

## 1.7.2

### Patch Changes

- [`3010073`](https://github.com/marschhuynh/nuvin-space/commit/3010073037b477e2dbb0701fa3d5c43366d58364) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Adds pnpm override for ink dependency to use @nuvin/ink@6.5.1-alpha.1

## 1.7.1

### Patch Changes

- [`f1e311c`](https://github.com/marschhuynh/nuvin-space/commit/f1e311ca5d2b3cee3111df9cdacf042957d05255) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Update ink to alpha version and remove padding from Footer component

  - Updated @nuvin/ink dependency from 6.5.1 to 6.5.1-alpha.1
  - Removed paddingX from Footer component's working directory display
  - Cleaned up package.json configurations

## 1.7.0

### Minor Changes

- [`20f4322`](https://github.com/marschhuynh/nuvin-space/commit/20f432282fd71509ee886c0faf4407a76d459947) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Add `--resume` (or `-r`) flag to resume the most recent session when starting the app.

### Patch Changes

- [`41b4f59`](https://github.com/marschhuynh/nuvin-space/commit/41b4f5904177aababa9da3f5253f844107126031) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Fix `/history` command to switch to the selected session instead of loading messages into current session. New messages are now appended to the selected session's history.

## 1.6.0

### Minor Changes

- [`de16725`](https://github.com/marschhuynh/nuvin-space/commit/de16725d520098d68355a4cd2b2e3f08268165d3) Thanks [@marschhuynh](https://github.com/marschhuynh)! - feat: Enhance LLM streaming and Github provider

  - **Core**: Improved `BaseLLM` streaming handling to support unknown fields (e.g. reasoning metadata) dynamically.
  - **Core**: Better tool call merging and usage tracking in streaming responses.
  - **GitHub Provider**: Updates to GitHub transport and model definitions.
  - **CLI**: Updated LLM factory and orchestrator to leverage new core capabilities.

- [`2992369`](https://github.com/marschhuynh/nuvin-space/commit/2992369a1f89428c312500f7085f9a7773c5c5ff) Thanks [@marschhuynh](https://github.com/marschhuynh)! - feat: Add multi-profile support

  - Added support for multiple configuration profiles.
  - Profiles allow switching between different environments/configurations easily.
  - New `profile-manager` and related logic in CLI config.

### Patch Changes

- Updated dependencies [[`de16725`](https://github.com/marschhuynh/nuvin-space/commit/de16725d520098d68355a4cd2b2e3f08268165d3)]:
  - @nuvin/nuvin-core@1.2.0

## 1.5.1

### Patch Changes

- [`af0232a`](https://github.com/marschhuynh/nuvin-space/commit/af0232ab2d5ff44afa8e84efdef70be447ae7899) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Improve welcome screen UX with enhanced recent activity display and better time formatting. Refactor streaming markdown hook for better performance. Simplify topic analysis call to fire-and-forget pattern.

- Updated dependencies [[`3f7a1e2`](https://github.com/marschhuynh/nuvin-space/commit/3f7a1e2297bfe7e3602749afdbb3435c30eb9868)]:
  - @nuvin/nuvin-core@1.1.2

## 1.5.0

### Minor Changes

- [`48331d7`](https://github.com/marschhuynh/nuvin-space/commit/48331d78cfb34167e17df70e7fb441c62d980d04) Thanks [@marschhuynh](https://github.com/marschhuynh)! - **New Features:**

  - Topic analyzer now includes all previous user messages for better context analysis
  - Conversation topics are automatically analyzed and updated after each user input
  - `/history` command now displays conversation topics instead of last messages

  **Improvements:**

  - Enhanced topic analysis with full conversation history context
  - Better topic extraction by analyzing only user messages (excluding assistant and tool messages)
  - Session metadata now includes topic information for easier conversation identification

## 1.4.0

### Minor Changes

- [`8a1b3c9`](https://github.com/marschhuynh/nuvin-space/commit/8a1b3c95e8e7e501ae24d7030f9d26aed5548ecf) Thanks [@marschhuynh](https://github.com/marschhuynh)! - **Help Bar Feature:**

  - Add help bar above input area showing keyboard shortcuts
    - Displays 'Ctrl+E show detail · ESC×2 stop · / command'
    - Uses single border line for clean appearance
    - Highlighted shortcuts in accent color

  **Tool Result Display Improvements:**

  - Simplify file_new display to match file_read pattern
    - Normal mode: Shows only file path and status (└─ Created)
    - Explain mode: Shows full file content with Markdown rendering
    - Add FileNewRenderer for better tool result visualization
    - Update ToolContentRenderer to conditionally render based on explain mode

  **Display Refinements:**

  - Clean up file_read and file_new result display
    - Hide 'Done' line for file_read and file_new in normal mode
    - Show 'Done' line only in explain mode when content is displayed
    - Restructure shouldShowResult logic to separate status line from content

  **Status Handling:**

  - Add 'denied by user' status handling in ToolResultView
    - Detect denial in error messages
    - Show 'Denied' status in yellow/warning color
    - Consistent with 'Aborted' status handling

  **Explain Mode Footer:**

  - Update Footer for explain mode
    - Show only 'Ctrl+E to toggle' message when in explain mode
    - Hide all other status info (provider, model, tokens, costs)
    - Provides focused, minimal interface in explain mode

### Patch Changes

- [`8a1b3c9`](https://github.com/marschhuynh/nuvin-space/commit/8a1b3c95e8e7e501ae24d7030f9d26aed5548ecf) Thanks [@marschhuynh](https://github.com/marschhuynh)! - **Critical Fixes:**

  - Fix unsafe type casting in EventBus that could cause runtime errors
  - Add error handling for JSON parsing in ToolResultView to prevent crashes from malformed tool arguments
  - Export `ErrorReason` enum from `@nuvin/nuvin-core` for better error categorization

  **Improvements:**

  - Add `ErrorReason` metadata to tool execution results for better error tracking
  - Improve error categorization in BashTool (permission denied, not found, timeout)
  - Better error display in ToolResultView with status icons for different error types
  - Add fallback behavior for `useExplainMode` when used outside provider context
  - Refactor UpdateChecker and AutoUpdater to use namespaces instead of static classes
  - Extract magic numbers to constants in BashToolRenderer

  **Code Quality:**

  - Remove unnecessary biome-ignore comments
  - Fix useMemo dependencies in ExplainModeContext
  - Improve error messaging and user feedback throughout the application

- Updated dependencies [[`8a1b3c9`](https://github.com/marschhuynh/nuvin-space/commit/8a1b3c95e8e7e501ae24d7030f9d26aed5548ecf)]:
  - @nuvin/nuvin-core@1.1.1

## 1.3.0

### Minor Changes

- [`77334ba`](https://github.com/marschhuynh/nuvin-space/commit/77334bae65ad541b25eaf99459f8f7097dc1c440) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Add explain mode with Ctrl+E toggle and improve tool result display

  **Explain Mode Features:**

  - Press Ctrl+E to toggle between interactive and explain modes
  - View-only mode with full tool call/result details
  - Pretty-printed JSON parameters with 2-space indentation
  - Full content display without truncation
  - Footer shows "Ctrl+E to toggle" message in explain mode

  **Tool Display Improvements:**

  - Add help bar above input showing keyboard shortcuts (Ctrl+E, ESC×2, /)
  - Simplify file_new and file_read display in normal mode
    - Show only file path and status (e.g., "└─ Created", "└─ Read 59 lines")
    - Hide verbose content and "Done" line
  - Explain mode shows full file content with Markdown rendering
  - Add friendly tool name mapping (file_read → "Read file", todo_write → "Update todo", etc.)

  **Status Handling:**

  - Add "Denied" status for user-denied tool approvals
  - Consistent yellow/warning color for Denied and Aborted statuses
  - Improved status line logic for cleaner output

  **User Experience:**

  - Clean, minimal display in normal mode
  - Detailed inspection mode via Ctrl+E toggle
  - Consistent across all tool types
  - Better visual hierarchy with proper tree branching (├─, └─)

## 1.2.1

### Patch Changes

- [`5f528cd`](https://github.com/marschhuynh/nuvin-space/commit/5f528cd5274cd7058e8c3945d198db6dadb92b65) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Test trusted publishing workflow configuration

## 1.2.0

### Minor Changes

- [`ad080e2`](https://github.com/marschhuynh/nuvin-space/commit/ad080e21036ebd74752cee6105349c487c894f00) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Add custom provider configuration support in config.yaml. Users can now define custom OpenAI-compatible providers with type, baseUrl, and models fields. Custom providers automatically appear in the /model command and support dynamic model listing.

- [`6182a96`](https://github.com/marschhuynh/nuvin-space/commit/6182a966aa3579983f67a46647d935e0ea2f1819) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Upgrade Ink to v6.5.0 with incremental rendering support. Enable incrementalRendering flag and increase maxFps to 60 for smoother UI updates and better performance.

### Patch Changes

- [`7513ee8`](https://github.com/marschhuynh/nuvin-space/commit/7513ee818ed28e3efbc98d1cca2c0765d4355e27) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Fix markdown rendering for final assistant messages. Always update content and trigger re-render when streaming completes to ensure markdown is properly rendered. Previously, final messages would sometimes display raw markdown instead of formatted content.

- Updated dependencies [[`4ecfa09`](https://github.com/marschhuynh/nuvin-space/commit/4ecfa09550f43e60943c1d06dcc27eb782580f27), [`da66afa`](https://github.com/marschhuynh/nuvin-space/commit/da66afae845e697e9706d9175c888618811388fd), [`d3411e4`](https://github.com/marschhuynh/nuvin-space/commit/d3411e453323d9de85f42b40a3f66f4f06132398)]:
  - @nuvin/nuvin-core@1.1.0

## 1.1.0

### Minor Changes

- [`6b42a67`](https://github.com/marschhuynh/nuvin-space/commit/6b42a67a90cf1d4ff8be9679eede9f8fdbfc5b41) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Add automatic update functionality with background updates

  - Add UpdateChecker service to query npm registry for latest version
  - Add AutoUpdater service with intelligent package manager detection (npm/pnpm/yarn)
  - Integrate auto-update check on CLI startup with background update capability
  - Support detection of installation method via executable path analysis

## 1.0.2

### Patch Changes

- [`1408707`](https://github.com/marschhuynh/nuvin-space/commit/140870791f123de29ea5550150d0efcd4c2b3ae9) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Fix config set command to properly handle array notation

  Added support for array bracket notation (e.g., `auth[0]`) in config paths. Previously, `nuvin config set providers.openrouter.auth[0].api-key "sk-xxx" --global` would create an incorrect structure with `auth[0]` as a string key. Now it properly creates an array with indexed elements.

  - Fix createNestedObject to parse and handle array notation
  - Fix deepMerge to merge array elements by index
  - Add comprehensive tests (26 new tests)

## 1.0.1

### Patch Changes

- [`ac0575a`](https://github.com/marschhuynh/nuvin-space/commit/ac0575a8691a3340796d8867f88cbadf998daae5) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Add path alias configuration for @/ imports across TypeScript, build, and test tools

- [`40b208c`](https://github.com/marschhuynh/nuvin-space/commit/40b208cbf0994b65152469e4590bffd087144123) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Fix cost tracking to return actual cost from OpenRouter and prevent double-counting in event processor

- [`97c6320`](https://github.com/marschhuynh/nuvin-space/commit/97c6320b2875ea35800d76b1720149b100f8e92a) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Replace relative imports with @/ path alias for improved code maintainability

- Updated dependencies [[`40b208c`](https://github.com/marschhuynh/nuvin-space/commit/40b208cbf0994b65152469e4590bffd087144123)]:
  - @nuvin/nuvin-core@1.0.1

## 1.0.0

### Major Changes

- [`05fad0c`](https://github.com/marschhuynh/nuvin-space/commit/05fad0ca6722b823554dc388e0583c54d8851512) Thanks [@marschhuynh](https://github.com/marschhuynh)! - **BREAKING CHANGE:** Sub-agent delegation API signatures changed

  Enable fresh LLM configuration for sub-agents with factory pattern. Sub-agents now automatically pick up the current active model and provider without requiring orchestrator restart.

  ## Features

  - **Fresh Config for Sub-Agents**: Sub-agents now get fresh LLM instances with current model/provider configuration via factory pattern
  - **Template Overrides**: Agent templates can specify `provider` and `model` fields to override defaults (e.g., `provider: zai`, `model: glm-4-flash`)
  - **Config Resolver Pattern**: Added callback to provide fresh config values (model, reasoningEffort) on each sub-agent creation
  - **Cleaner Architecture**: Factory and resolver patterns for better separation of concerns

  ## Breaking Changes

  ### API Signature Changes

  **AgentManager:**

  ```typescript
  // Before
  new AgentManager(config, llm, tools, llmFactory?, eventCallback?)

  // After
  new AgentManager(config, tools, llmFactory?, eventCallback?, configResolver?)
  ```

  **AgentManagerCommandRunner:**

  ```typescript
  // Before
  new AgentManagerCommandRunner(config, llm, tools, llmFactory?)

  // After
  new AgentManagerCommandRunner(config, tools, llmFactory?, configResolver?)
  ```

  **ToolPort.setOrchestrator:**

  ```typescript
  // Before
  setOrchestrator(config, llm, tools, llmFactory?)

  // After
  setOrchestrator(config, tools, llmFactory?, configResolver?)
  ```

  ### Removed Parameters

  - Removed `llm` parameter from entire delegation chain (use factory instead)
  - Removed unused `apiKey` field from `AgentTemplate`, `SpecialistAgentConfig`, and `LLMConfig` (API keys managed via ConfigManager only)

  ## Implementation Details

  - **LLMFactory & LLMResolver**: Always creates fresh LLM instances via factory pattern
  - **Config Priority**: Template model/provider > Fresh active config > Delegating agent config
  - **Provider Validation**: Validates provider has auth configured before using template override
  - **Type Safety**: Proper interface segregation with `AgentAwareToolPort` and `OrchestratorAwareToolPort`

  ## Migration Guide

  If you're using the delegation APIs directly, update your code:

  ```typescript
  // Update AgentManager instantiation
  const agentManager = new AgentManager(
    delegatingConfig,
    delegatingTools, // llm parameter removed
    llmFactory,
    eventCallback,
    configResolver // new parameter
  );

  // Update setOrchestrator calls
  toolRegistry.setOrchestrator(
    config,
    tools, // llm parameter removed
    llmFactory,
    configResolver // new parameter
  );
  ```

  Most users won't be affected as these are internal APIs. The `assign_task` tool works the same as before.

### Patch Changes

- Updated dependencies [[`05fad0c`](https://github.com/marschhuynh/nuvin-space/commit/05fad0ca6722b823554dc388e0583c54d8851512)]:
  - @nuvin/nuvin-core@1.0.0

## 0.1.0

### Minor Changes

- [`e43c58b`](https://github.com/marschhuynh/nuvin-space/commit/e43c58bab64c2184010972250d62c63af6a5f393) Thanks [@marschhuynh](https://github.com/marschhuynh)! - Initial release of Nuvin - Interactive AI coding assistant CLI

### Patch Changes

- Updated dependencies [[`e43c58b`](https://github.com/marschhuynh/nuvin-space/commit/e43c58bab64c2184010972250d62c63af6a5f393)]:
  - @nuvin/nuvin-core@0.1.0
