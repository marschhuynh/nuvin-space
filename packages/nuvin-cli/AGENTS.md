# AGENTS.md

This file provides guidance to Nuvin cli when working with code in this repository.

## Commands

```bash
# Build the CLI (runs TypeScript check, compiles with tsup, generates version, obfuscates)
pnpm build

# Build without type checking (faster)
SKIP_TYPE_CHECK=1 pnpm build

# Development mode (watch for changes, rebuild on file edit)
pnpm dev

# Run CLI in development mode (executes source/cli.tsx directly)
pnpm run:dev

# Run built CLI locally
pnpm run:prod

# Run all tests
pnpm test

# Run specific test file
pnpm test tests/eventProcessor.test.ts

# Run tests in watch mode
pnpm test -- --watch

# Run tests with coverage
pnpm test -- --coverage

# Lint with Biome
pnpm lint

# Auto-format code with Biome
pnpm format

# Clean build artifacts
pnpm clean
```

## Architecture

### Core Stack
- **React 19 + Ink** - Terminal UI framework (NOT browser React - no DOM, renders to terminal)
- **TypeScript** - Strict mode with path aliases (`@/*` maps to `source/*`)
- **@nuvin/nuvin-core** - External workspace package providing AgentOrchestrator, tools, and core types
- **Event Bus** - Pub/sub system for decoupled component communication

### Entry Point Flow

1. **`source/cli.tsx`** - CLI entry point that:
   - Parses CLI arguments with `meow`
   - Loads layered configuration (env → global → workspace → explicit → CLI flags)
   - Pre-processes env vars for auth
   - Bootstraps the Ink React app via `render(<App />)`

2. **`source/app.tsx`** - Root React component that:
   - Initializes `EventBus`, `OrchestratorManager`, `MCPServerManager`, and command registries
   - Wraps everything in React contexts (Config, Theme, ToolApproval, Notification)
   - Renders `InteractionArea` as the main UI

### Critical Data Flows

**User Input → Orchestrator**:
```
InputArea.tsx (user types) → useHandleSubmit hook → OrchestratorManager.ts
                                              → @nuvin/nuvin-core AgentOrchestrator
```

**Agent Events → UI Rendering**:
```
AgentOrchestrator emits events → UIEventAdapter.tsx processes them
                              → eventProcessor.ts converts to MessageLine[]
                              → ChatDisplay.tsx renders with virtualization
```

**Tool Execution → Approval → Result**:
```
Orchestrator requests tool → ToolApprovalContext checks requireToolApproval
                          → If approved: tools execute via core
                          → Results stream back → enrichToolCalls.ts adds metadata
                          → ChatDisplay shows tool execution + results
```

### OrchestratorManager (`source/services/OrchestratorManager.ts`, ~1261 lines)

The core service wrapping `@nuvin/nuvin-core`'s `AgentOrchestrator`:

- **Initialization**: Created via `useOrchestrator` hook, initialized with config, tools, and event handlers
- **Tool Handlers**: Registers file ops, web search, bash, MCP tools, and `assign_task` for delegation
- **Event Emission**: Emits `ui:*` events that `UIEventAdapter` transforms into React state updates
- **Sub-Agent Handling**: Manages specialist agent delegation with event tagging for UI hierarchy

### Event Bus Pattern

Components communicate through `EventBus.ts` rather than direct imports:

```typescript
// Emitting events
eventBus.publish('mcp:serversChanged', servers);

// Subscribing (typically in useEffect)
eventBus.subscribe('ui:error', (error) => handleError(error));
```

Key events: `ui:line`, `ui:error`, `ui:thinking`, `mcp:serversChanged`, `agent:delegated`

### Layered Configuration

Priority (low → high):
1. Global config: `~/.nuvin-cli/config.yaml`
2. Workspace config: `./.nuvin-cli/config.yaml`
3. Explicit file: `--config` flag
4. Env vars: `OPENROUTER_API_KEY`, etc. (processed in `cli.tsx`)
5. CLI args: `--provider`, `--model` (highest)

`ConfigManager` handles merging, `ConfigContext` provides to React tree, `ConfigBridge` syncs changes to orchestrator.

### Multi-Agent System

**Main Agent** (OrchestratorManager) handles user interaction and can delegate via `assign_task` tool:

- **code-investigator**: Codebase analysis, bug tracing, architecture mapping
- **code-security-auditor**: Security vulnerability identification
- **feature-code-reviewer**: Code quality reviews for PRs
- **testing-specialist**: Unit test generation with edge case coverage
- **tui-application-designer**: Terminal UI application development
- **aws-cloud-architect-w546**: AWS infrastructure design and review

Specialist agents are independent `AgentOrchestrator` instances created by `AgentCreator.ts`, each with custom system prompts and tool configurations.

### Key Files Cross-Reference

| Concern | Files |
|---------|-------|
| User input flow | `hooks/useHandleSubmit.ts` → `services/OrchestratorManager.ts` |
| Event → UI | `adapters/ui-event-adapter.tsx` → `utils/eventProcessor.ts` → `components/ChatDisplay.tsx` |
| Config loading | `cli.tsx` (env) → `config/manager.ts` → `contexts/ConfigContext.tsx` |
| Tool approval | `contexts/ToolApprovalContext.tsx` → `components/ToolApprovalPrompt/` |
| MCP integration | `services/MCPServerManager.ts` → `config/mcp-handler.ts` → `components/MCPModal.tsx` |
| Scrolling UI | `components/AutoScrollBox.tsx` → `components/VirtualizedList.tsx` |
| Command registry | `modules/commands/registry.ts` → `services/CustomCommandRegistry.ts` → `hooks/useCommand.ts` |

### Directory Structure

```
source/
├── cli.tsx              # CLI entry point (arg parsing, config preload)
├── app.tsx              # Root component (service initialization)
├── config/              # Configuration system
│   ├── manager.ts       # ConfigManager (504 lines)
│   ├── profile-manager.ts
│   ├── mcp-handler.ts   # MCP config loading
│   └── providers.ts     # LLM provider definitions
├── services/            # Business logic
│   ├── OrchestratorManager.ts  # Core orchestrator wrapper (1261 lines)
│   ├── EventBus.ts             # Pub/sub
│   ├── LLMFactory.ts           # Provider instantiation
│   ├── MCPServerManager.ts     # MCP server lifecycle
│   ├── CustomCommandRegistry.ts # User commands
│   └── AgentCreator.ts         # Specialist agent creation
├── components/          # React/Ink UI
│   ├── ChatDisplay.tsx         # Message rendering (virtualized)
│   ├── InputArea.tsx           # Text input with multiline/paste
│   ├── ToolCallViewer/         # Tool execution visualization
│   ├── AutoScrollBox.tsx       # Auto-scroll behavior
│   ├── VirtualizedList.tsx     # Virtual scrolling
│   └── Footer.tsx              # Status bar
├── hooks/               # Custom React hooks
│   ├── useOrchestrator.ts      # OrchestratorManager lifecycle
│   ├── useHandleSubmit.ts      # User input handling
│   ├── useGlobalKeyboard.ts    # Keyboard shortcuts
│   └── useSessionManagement.ts # History persistence
├── contexts/            # React contexts
├── modules/commands/    # Built-in commands
│   ├── registry.ts      # CommandRegistry class
│   └── hooks/useCommand.ts
├── adapters/
│   └── ui-event-adapter.tsx    # Core events → React bridge
├── utils/
│   ├── eventProcessor.ts        # Events → MessageLines
│   ├── enrichToolCalls.ts       # Add tool metadata
│   └── messageProcessor.ts
└── types/
```

## Code Style

- **Linter/Formatter**: Biome (`biome.json`)
  - Single quotes, 2-space indent, 120 char line width
  - `noExplicitAny: "error"` - never use `any` type (will cause build failure)
- **TypeScript**: Strict mode with path aliases (`@/utils/foo` → `source/utils/foo`)
- **React**: Functional components with hooks only
- **File Naming**: PascalCase (components), camelCase (hooks/utils), `use*` prefix for hooks

## Testing

- **Framework**: Vitest (`vitest.config.ts`)
- **Component Tests**: `ink-testing-library` with mocked `process.stdout`
- **Test Location**: `tests/` directory with `*.test.ts` or `*.test.tsx` naming
- **Legacy**: Some old tests use AVA (excluded from vitest config via `test.exclude`)
