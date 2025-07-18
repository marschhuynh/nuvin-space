# Project Architecture

This document outlines the overall structure of the **Nuvin Agent** project and the relationships between its major components.

## Overview

Nuvin Agent is a multi-platform desktop application built with **Go**, **Wails** and a **React/TypeScript** frontend. The project allows interaction with both local Large Language Model (LLM) providers and remote agents using the A2A protocol.

The repository is organised into two main parts:

```
root/
├── nuvin-ui/    # Wails application (Go backend and React frontend)
├── main.go      # Example Go program using keyboard hooks
└── ...
```

The `nuvin-ui` directory contains the production application. It includes the Go backend that exposes functionality to the frontend and the `frontend` folder which holds all React/TypeScript code.

## Backend (Go)

The backend exposes a small API surface via Wails:

- **FetchProxy** – a helper to perform HTTP requests on behalf of the frontend while bypassing CORS restrictions.
- **GitHub OAuth** – device flow authentication used for GitHub Copilot integration.

The backend acts primarily as a bridge to allow the React application to run as a desktop app with access to local resources.

## Frontend (React/TypeScript)

### Agent Manager

The heart of the application is the `AgentManager` class defined in `src/lib/agent-manager.ts`. It maintains the currently active agent and provider, stores conversation history and delegates message sending to the appropriate agent implementation:

```ts
private activeAgent: AgentSettings | null = null;
private activeProvider: ProviderConfig | null = null;
private agentInstance: BaseAgent | null = null;
```

Depending on `activeAgent.agentType`, it creates either a `LocalAgent` or an `A2AAgent` instance.

### Agents

All agents extend the abstract `BaseAgent` class (`src/lib/agents/base-agent.ts`), which stores conversation history and builds the provider context. There are two concrete agent types:

- **LocalAgent** (`src/lib/agents/local-agent.ts`)
  - Wraps an LLM provider such as OpenAI or Anthropic.
  - Supports both standard and streaming responses.
- **A2AAgent** (`src/lib/agents/a2a-agent.ts`)
  - Communicates with remote agents via the A2A protocol implemented in `src/lib/a2a.ts`.
  - Handles streaming events and task polling.

### Providers

LLM providers conform to the `LLMProvider` interface (`src/lib/providers/llm-provider.ts`) which defines methods to generate completions and list available models. The project ships with providers for OpenAI, Anthropic, GitHub Copilot and OpenRouter under `src/lib/providers/`.

### State Management

Application state such as conversations, agents and provider settings is persisted using Zustand stores in the `src/store/` directory. For example:

- `useAgentStore.ts` – stores configured agents and the currently active agent.
- `useConversationStore.ts` – stores conversation threads and messages.
- `useProviderStore.ts` – stores provider configurations.

### UI Modules

The React UI is composed of modules located under `src/modules/` and screens under `src/screens/`. The chat interface is implemented in the `Messenger` component (`src/screens/Dashboard/messenger.tsx`) which interacts with the agent manager via the `useAgentManager` hook.

## Relationships Between Entities

- **Agent Manager** controls which agent/provider is active and delegates message sending.
- **Agent** implements logic specific to local providers (`LocalAgent`) or remote A2A agents (`A2AAgent`). Both derive from `BaseAgent` and record conversation history.
- **Provider** implements the `LLMProvider` interface and is used by `LocalAgent` to talk to an external LLM service.
- **Stores** keep persistent settings and conversation data which the Agent Manager and UI components read from.

The diagram below summarises the high-level relationships:

```
User UI ↔ useAgentManager ↔ AgentManager
                 │
                 ├── LocalAgent ──► LLMProvider (OpenAI, Anthropic, ...)
                 └── A2AAgent ───► A2AService ──► Remote Agent
```

The README in the repository root provides an additional description of these components and their responsibilities.

