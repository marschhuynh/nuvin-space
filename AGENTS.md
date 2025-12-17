# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nuvin is an interactive AI coding assistant CLI built as a monorepo with multiple packages. It features a multi-provider LLM system with support for GitHub Models, OpenRouter, DeepInfra, Anthropic, and other providers. The system includes a multi-agent architecture for task delegation, rich toolset integration, and a React-based terminal UI using Ink.

## Monorepo Structure

- **packages/nuvin-core** - Core orchestration engine (TypeScript)
  - Agent orchestration and delegation system
  - LLM provider abstraction layer
  - Tool implementations (file ops, bash, web search/fetch, MCP integration)
  - Conversation memory and state management

- **packages/nuvin-cli** - Terminal UI and CLI (React + Ink)
  - React-based terminal interface components
  - Configuration management system
  - Built-in commands and session management
  - Theme system and user interactions

- **packages/ink** - Custom fork of Ink (React for CLIs)
  - Modified version with custom features

## Common Development Commands

### Building
```bash
# Build all packages
pnpm build

# Build specific package
pnpm build:core
pnpm build:cli

# Clean build artifacts
pnpm clean
```

### Development
```bash
# Run in development mode (with tsx)
pnpm run:dev

# Run built version
pnpm run:prod

# Watch mode for development
pnpm dev
```

### Testing
```bash
# Run all tests
pnpm test

# Run tests in watch mode (core package)
pnpm test:watch
```

### Code Quality
```bash
# Format code
pnpm format

# Lint code
pnpm lint
```

### Running Specific Tests
```bash
# Core package tests
cd packages/nuvin-core
pnpm test

# CLI package tests
cd packages/nuvin-cli
pnpm test
```

## Architecture

### Core Package (`@nuvin/nuvin-core`)

**Key Components:**

1. **AgentOrchestrator** (`orchestrator.ts`)
   - Main execution loop for agent interactions
   - Manages message flow between user, LLM, and tools
   - Handles streaming responses and tool execution
   - Coordinates with sub-agents through AgentManager

2. **AgentManager** (`agent-manager.ts`)
   - Coordinates specialist agent execution for task delegation
   - Creates isolated agent contexts with separate memory
   - Supports context sharing between delegating and specialist agents
   - Enforces delegation depth limits (max 3 levels)

3. **LLM Provider System** (`llm-providers/`)
   - Factory pattern for adding OpenAI-compatible providers
   - Configuration-driven provider registration (see `llm-provider-config.json`)
   - Special implementations: GithubLLM, AnthropicAISDKLLM, EchoLLM
   - To add a new provider: update `llm-provider-config.json` and `packages/nuvin-cli/source/config/providers.ts`

4. **Tool System** (`tools/`)
   - Port-based architecture with standard interface (`ToolPort`)
   - Built-in tools: FileRead, FileEdit, FileNew, DirLs, Bash, WebSearch, WebFetch, TodoWrite, Assign
   - Tool result metadata for rich UI feedback
   - Type guards and validators for runtime safety

5. **Delegation System** (`delegation/`)
   - LLMResolver for provider selection per agent
   - DefaultDelegationService for orchestrating task handoffs
   - AgentManagerCommandRunner for executing delegation commands
   - DelegationPolicy for approval workflows

6. **MCP Integration** (`mcp/`)
   - Model Context Protocol client for external tool integration
   - Dynamic tool loading from MCP servers
   - Tool metadata conversion between MCP and internal format

### CLI Package (`@nuvin/nuvin-cli`)

**Key Components:**

1. **App Component** (`source/app.tsx`)
   - Main React component orchestrating the UI
   - Manages orchestrator lifecycle and message flow
   - Handles keyboard input, vim mode, tool approval
   - Session management and metrics tracking

2. **Configuration System** (`source/config/`)
   - Layered config resolution: global → local → env → CLI flags
   - ConfigManager for loading/merging YAML configs
   - Profile system for managing multiple configurations
   - Provider-specific settings and API key management

3. **React Components** (`source/components/`)
   - ChatDisplay: Message rendering with markdown support
   - InputArea: User input with multi-line support
   - Footer: Status bar with metrics and mode indicators
   - Modal system: Agent creation, MCP server management, help dialogs

4. **Built-in Commands** (`source/modules/commands/definitions/`)
   - `/auth` - API key and authentication management
   - `/agent` - Create and manage specialist agents
   - `/mcp` - MCP server configuration
   - `/models` - List available models
   - `/history` - Session history management
   - `/export` - Export conversation history
   - `/clear` - Clear screen
   - `/exit` - Exit application

5. **Hooks** (`source/hooks/`)
   - `useOrchestrator` - Manages agent orchestrator lifecycle
   - `useSessionManagement` - Session persistence and loading
   - `useKeyboardInput` - Keyboard handling including vim mode
   - `useHandleSubmit` - Message submission logic

6. **Event System** (`source/services/`)
   - EventBus for application-wide events
   - OrchestratorManager for singleton orchestrator access
   - SessionMetricsService for tracking usage and costs

## Important Patterns

### Port-Based Architecture
The core package uses dependency injection via "ports" (interfaces):
- `LLMPort` - LLM provider abstraction
- `ToolPort` - Tool execution interface
- `MemoryPort` - Conversation storage
- `MetricsPort` - Usage tracking
- `EventPort` - Event emission

This allows swapping implementations without changing core logic.

### Message Flow
1. User input → `App.tsx`
2. `useHandleSubmit` hook → `orchestrator.sendMessage()`
3. `AgentOrchestrator` → LLM provider
4. Stream events → EventBus → UI updates via `useOrchestrator`
5. Tool execution → Tool approval (if enabled) → Tool execution → Results back to LLM

### Agent Delegation
When using the `AssignTool`, the orchestrator:
1. Creates a specialist agent via `AgentManager.executeTask()`
2. Optionally shares context from parent agent
3. Specialist agent runs independently with own memory
4. Results formatted and returned to delegating agent
5. Delegation depth enforced (max 3 levels)

### Adding New LLM Providers
For OpenAI-compatible providers:
1. Add entry to `packages/nuvin-core/src/llm-providers/llm-provider-config.json`
2. Add UI config to `packages/nuvin-cli/source/config/providers.ts`
3. Rebuild and test

See `docs/adding-new-provider.md` for complete guide.

## Testing

- **Core tests**: Located in `packages/nuvin-core/src/tests/`
- **CLI tests**: Located in `packages/nuvin-cli/tests/`
- Tests use Vitest framework
- Core tests run with `pnpm test` in nuvin-core package
- Some CLI tests still use Ava (legacy)

## Build System

- Uses `tsup` for TypeScript bundling
- Custom build scripts in `scripts/build.js` for both packages
- Includes JavaScript obfuscation for production builds
- TypeScript with ES2020 target
- ESM modules throughout

## Configuration

Users can configure via:
1. Global config: `~/.nuvin-cli/config.yaml`
2. Local config: `./.nuvin/config.yaml`
3. Environment variables: `OPENROUTER_API_KEY`, `GOOGLE_CSE_KEY`, etc.
4. CLI flags: `--provider`, `--model`, `--api-key`, etc.
5. Profiles: Managed via `nuvin profile` commands

## File Paths
- CLI source code uses `source/` directory (not `src/`)
- Core package uses `src/` directory
- Both compile to `dist/` directories
- Path aliases configured in tsconfig: `@/` maps to source root

## Changesets
The project uses changesets for version management:
```bash
pnpm changeset        # Create a changeset
pnpm version-packages # Update versions
pnpm release          # Publish packages
```
