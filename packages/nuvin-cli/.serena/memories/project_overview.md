# Project Overview: nuvin-cli

## Purpose
nuvin-cli is an interactive AI agent CLI powered by Nuvin core that transforms natural language requests into automated tasks with intelligent AI agent workflows. It provides a terminal-based chat interface for interacting with AI agents that can execute tasks, use tools, and maintain conversation history.

## Tech Stack
- **Language**: TypeScript (ES modules)
- **Framework**: React (for terminal UI using Ink)
- **Build Tool**: tsup (TypeScript bundler)
- **Code Quality**: Biome.js (linting + formatting)
- **Testing**: AVA (test framework)
- **Node Version**: >=22
- **Package Manager**: pnpm (workspace)

## Key Features
- Interactive terminal-based AI chat interface
- Support for multiple AI providers (OpenRouter, GitHub Copilot, Zai, Echo)
- MCP (Model Context Protocol) server integration
- Conversation history persistence
- Tool approval system for safety
- Real-time streaming responses
- Keyboard shortcuts and command system
- Message queue management
- Session management and history loading

## Codebase Structure
```
source/
├── app.tsx              # Main application component
├── cli.tsx              # CLI entry point
├── types.ts             # TypeScript type definitions
├── prompt.ts            # System prompts and configurations
├── components/          # React UI components for terminal interface
├── hooks/              # Custom React hooks for state and logic
├── utils/              # Utility functions and helpers
├── adapters/           # Event and data adapters
└── services/           # Core service classes (Orchestrator, EventBus, etc.)
```

## Key Components
- **App**: Main application orchestrator with keyboard handling and state management
- **ChatDisplay**: Optimized message rendering with line clamping
- **InputArea**: User input handling with history recall
- **Header**: Application branding and status display
- **Footer**: System status and metadata display
- **OrchestratorManager**: AI agent lifecycle management
- **EventBus**: Centralized event system for component communication

## Recent Changes (from git log)
- Major performance optimization in App.tsx with message clamping
- Enhanced InputArea with visual effects and styling
- Refactored ChatDisplay with new DisplayLine system
- Optimized Static rendering for better performance
- Added display utilities for optimized message line rendering
- Tool approval prompt integration
- Improved development workflow with Makefile updates