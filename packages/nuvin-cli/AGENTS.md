# AGENTS.md

This file provides guidance to Nuvin CLI when working with code in this repository.

## Common Commands

```bash
# Development
pnpm run:dev              # Run CLI in development mode (tsx)
pnpm dev                  # Watch mode (tsup)
pnpm run:prod             # Run production build

# Build
pnpm build                # Build with scripts/build.js
pnpm clean                # Remove dist/

# Testing
pnpm test                 # Run all tests (vitest)
pnpm test path/to/file    # Run specific test file

# Linting
pnpm lint                 # Biome lint
pnpm format               # Biome format (changed files)
```

## Architecture Overview

### Core Technologies
- **React/Ink** - Terminal UI framework for interactive CLI
- **TypeScript** - Strict mode, ES2020 target, JSX react-jsx
- **@nuvin/nuvin-core** - Core orchestrator engine (LLM providers, tools, agents)
- **tsup** - Bundler for production builds
- **Vitest** - Test runner with React plugin
- **Biome** - Linting and formatting (2-space indent, single quotes, 120 line width)

### Application Flow

```
cli.tsx (entry)
    ↓
ConfigManager.load() → merges global/local/explicit/env/CLI configs
    ↓
render(<App />) wrapped in providers:
    ThemeProvider → StdoutDimensionsProvider → ConfigProvider → 
    NotificationProvider → ToolApprovalProvider → CommandProvider → 
    ExplainModeProvider → ConfigBridge
    ↓
App.tsx initializes useOrchestrator() hook
    ↓
OrchestratorManager.init() → creates AgentOrchestrator + MCPServerManager
```

### Key Singletons

- **`orchestratorManager`** (`source/services/OrchestratorManager.ts`) - Central agent coordination, LLM creation, session management, MCP server management
- **`eventBus`** (`source/services/EventBus.ts`) - Typed event emitter for UI updates, tool approvals, keyboard events, command lifecycle
- **`commandRegistry`** (`source/modules/commands/registry.ts`) - Slash command registration and execution
- **`ConfigManager.getInstance()`** (`source/config/manager.ts`) - Layered config with scopes: global < local < explicit < env < direct

### Event-Driven Communication

Components communicate via `eventBus` events:
- `ui:line` / `ui:lines:set` / `ui:lines:clear` - Message display
- `ui:toolApprovalRequired` - Tool approval workflow
- `ui:command:activated` / `ui:command:deactivated` - Command UI state
- `conversation:created` - Session lifecycle

### Command System

Commands in `source/modules/commands/definitions/` can be:
- **Function commands** - Execute handler and return
- **Component commands** - Render React component until dismissed

Register commands via `commandRegistry.register()`. Component commands use `createState()` for local state.

### UI Event Adapter

`UIEventAdapter` (`source/adapters/ui-event-adapter.tsx`) bridges `@nuvin/nuvin-core` events to React UI:
- Extends `PersistingConsoleEventPort`
- Processes `AgentEvent` into `MessageLine` via `eventProcessor.ts`
- Handles streaming text, tool calls, thinking blocks

### Configuration Priority

1. Global: `~/.nuvin-cli/config.yaml`
2. Local: `./.nuvin-cli/config.yaml`
3. Explicit: `--config path`
4. Environment: `OPENROUTER_API_KEY`, `ANTHROPIC_API_KEY`, etc.
5. CLI flags: `--provider`, `--model`, `--api-key` (highest priority)

### Memory & Sessions

- **PersistedMemory** - JSON file persistence at `~/.nuvin-cli/sessions/<id>/history.json`
- **InMemoryMemory** - Non-persisted fallback
- Sessions tracked via `sessionMetricsService` for token usage and costs

### MCP Integration

`MCPServerManager` handles Model Context Protocol servers:
- Config in `mcp.servers` section
- Tools merged into orchestrator via `CompositeToolPort`
- Per-tool allow/deny configuration

## Code Conventions

- Path alias: `@/*` → `source/*`
- Hooks in `source/hooks/`, export via `index.ts`
- Components in `source/components/`, each in own directory with `index.ts` if complex
- Services are singletons exported from module
- Tests mirror source structure in `tests/`

## Provider Auth Structure

```typescript
providers: {
  [provider]: {
    auth: [{ type: 'api-key', 'api-key': 'xxx' }],
    'current-auth': 'api-key',
    defaultModel?: string
  }
}
```

## Testing Notes

- Some tests excluded in vitest.config.ts (use ava): `inputArea.test.ts`, `utils.test.ts`
- React component tests use `@vitejs/plugin-react` with babel-plugin-react-compiler
- Test files: `tests/**/*.test.{ts,tsx}`
