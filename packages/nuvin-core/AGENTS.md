# nuvin-core — Agent Engine Overview

This document explains the purpose and current design patterns of `nuvin-core`, the headless agent engine used by the CLI and desktop UI. It focuses on how the orchestrator, ports, tools, LLM providers, memory, and events work together and how to extend them safely.

## Purpose

- Provide a small, composable "agent runtime" that:
  - Orchestrates turns between user, assistant, and tools
  - Supports both streaming and non-streaming LLMs
  - Persists conversation state (in-memory or JSON file)
  - Exposes a simple Tool interface with optional MCP adapters
  - Emits lifecycle events for UI/telemetry
- Keep the surface area minimal and pragmatic so CLIs and UIs can embed it without heavy dependencies.

## High-Level Flow

1. Orchestrator receives a user message and builds provider messages from memory + system prompt.
2. LLM generates content and (optionally) tool calls; streaming is supported.
3. If tool calls are present, tools execute; results are appended as tool messages.
4. The orchestrator may ask the LLM again with tool outputs until no further tools are required.
5. The turn is persisted to memory and relevant events are emitted throughout.

## Core Design Patterns

- Ports & Adapters (Hexagonal)
  - All external systems are accessed via ports defined in `ports.ts` (LLM, Memory, Tools, Context, Clock, etc.).
  - Concrete implementations live in separate modules (e.g., `llm-providers`, `persistent`, `tools`, `transports`).
  - This keeps the orchestrator pure and testable.

- Dependency Injection
  - `AgentOrchestrator` receives a small `deps` object (memory, llm, tools, context, ids, clock, cost, reminders, events), enabling easy swapping in tests or different environments.

- Event-Driven UI
  - The orchestrator emits typed events (MessageStarted, AssistantChunk, ToolCalls, ToolResult, Done, Error, etc.).
  - UIs subscribe to these events to render progress without coupling to internal logic.

- Streaming First
  - LLM ports can implement `streamCompletion` to emit deltas while the orchestrator assembles the final message.
  - Non-streaming paths use `generateCompletion` with identical parameters.

- Tool Calling Loop
  - The orchestrator loops while the LLM returns tool calls (bounded depth).
  - Tool invocations are executed and results are appended to the accumulated provider messages before the next LLM call.

- Simple Persistence
  - The `MemoryPort<T>` interface supports get/set/append/clear with optional JSON-file persistence via `PersistedMemory`.
  - Snapshots can be exported/imported for debugging or replay.

## Key Modules

- `orchestrator.ts`
  - `AgentOrchestrator.send(content, opts)` coordinates a single turn.
  - Accepts `stream?: boolean` and `signal?: AbortSignal` (cancellation) in `SendMessageOptions`.
  - Emits events before, during, and after LLM calls and tool execution; persists turn history.

- `ports.ts`
  - Defines core types and interfaces:
    - `LLMPort` (generateCompletion/streamCompletion)
    - `ToolPort` and `ToolDefinition`/`ToolInvocation`
    - `MemoryPort` and `MemoryPersistence`
    - `ContextBuilder`, `IdGenerator`, `Clock`, `CostCalculator`, `RemindersPort`
    - `AgentEventTypes` and `EventPort`
  - Provider message schema (ChatMessage, ToolCall) mirrors OpenAI-style function calling.

- `persistent/`
  - `InMemoryMemory<T>`: volatile store backed by a Map.
  - `JsonFileMemoryPersistence<T>`: saves/loads snapshots to a JSON file.
  - `PersistedMemory<T>`: wraps `InMemoryMemory` with transparent persistence.

- `tools/` and `tools.ts`
  - `ToolRegistry` exposes built-in tools and routes `ToolInvocation[]` to concrete handlers.
  - Tools are "pure IO" from the orchestrator’s perspective: execute and return `ToolExecutionResult` objects.

- `tools-composite.ts`
  - `CompositeToolPort` composes multiple tool ports (e.g., local + MCP). Orchestrator sees a single `ToolPort`.

- `mcp/`
  - `MCPToolPort` adapts Model Context Protocol servers into the `ToolPort` interface. It discovers tool names and executes them over HTTP/stdio via a shared client.

- `llm-providers/`
  - `BaseLLM`: common HTTP/streaming logic (SSE parsing, usage accumulation). Accepts `AbortSignal` for cancellation.
  - `llm-openrouter.ts` and `llm-github.ts`: thin auth/transport layers on top of `BaseLLM`.
  - `llm-echo.ts`: a demo LLM that can synthesize tool calls from simple `!commands` and echo content.

- `events.ts`
  - `PersistingConsoleEventPort`: convenience `EventPort` that logs and can persist events to disk for debugging.

## Cancellation & Resilience

- Cancellation
  - `SendMessageOptions` includes an optional `AbortSignal`. The orchestrator passes it through to LLM calls and checks `signal.aborted` between phases (e.g., before/after tool calls) to stop promptly.
  - Tool execution currently runs to completion; add signal support to tool ports/implementations if needed.

- Error Handling
  - Provider and tool errors surface via `AgentEventTypes.Error` and thrown exceptions; UIs can render errors and continue the session.

## Extensibility Patterns

- Adding a New LLM
  - Implement `LLMPort` (prefer extending `BaseLLM` if HTTP/SSE-based).
  - Export from `llm-providers/index.ts` and wire up selection at the app layer.

- Adding a New Tool
  - Implement a tool class that conforms to your registry’s expectations and expose a `ToolDefinition` (JSON Schema params, description) and an `execute` function.
  - Register it in `ToolRegistry` (or provide a separate `ToolPort` and compose with `CompositeToolPort`).

- Changing Memory Backing
  - Provide another `MemoryPersistence` (e.g., SQLite, LevelDB) and wrap with `PersistedMemory`.

- Custom Context Building
  - Implement `ContextBuilder.toProviderMessages(history, systemPrompt, newUserContent)` to reshape how prior messages and the system prompt are presented to the LLM.

- Observability
  - Implement `EventPort` to forward events to your logger/telemetry.

## Design Choices (Why it looks like this)

- Keep the orchestrator small and deterministic; push vendor specifics to adapters.
- Use explicit, typed events instead of callbacks tangled with UI logic.
- Prefer JSON-serializable memory so sessions can be inspected and replayed.
- Treat tools as external capabilities with clear contracts and bounded concurrency.

## Gotchas

- Tool cancellations are not yet plumbed through; only LLM calls are cancellable by `AbortSignal`.
- Ensure environment variables are provided by the embedding app (e.g., API keys) — core does not load `.env`.
- When composing multiple tool ports, ensure name prefixes avoid collisions.

## Minimal Example (Pseudo-Code)

```ts
const memory = new PersistedMemory<Message>(new JsonFileMemoryPersistence('.history/core.json'));
const llm = new OpenRouterLLM(process.env['OPENROUTER_API_KEY']!);
const tools = new CompositeToolPort([new ToolRegistry(), new MCPToolPort(client, { prefix: 'mcp_' })]);
const orch = new AgentOrchestrator({
  id: 'agent', systemPrompt: prompt, model: 'openai/gpt-4.1', temperature: 1, topP: 1, maxTokens: 512,
  enabledTools: ['todo_write', 'web_search']
}, {
  memory, llm, tools,
  context: new SimpleContextBuilder(), ids: new SimpleId(), clock: new SystemClock(), cost: new SimpleCost(), reminders: new NoopReminders(),
  events: new PersistingConsoleEventPort({ filename: '.history/events.json' })
});

const ac = new AbortController();
const res = await orch.send('Plan my day', { conversationId: 'cli', stream: true, signal: ac.signal });
```

This encapsulates the current shape of `nuvin-core`: small, composable, and adaptable to different UIs and providers while keeping the orchestration logic simple and testable.
