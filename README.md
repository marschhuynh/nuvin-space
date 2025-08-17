# Nuvin Agent

A multi-platform desktop application for managing AI agents and providers, built with Go, Wails, and React. Nuvin Agent provides a unified interface for communicating with both local LLM providers and remote A2A (Agent-to-Agent) compatible agents.

## Features

- **Multi-Agent Support**: Connect to both local LLM providers and remote A2A agents
- **Provider Management**: Support for OpenAI, Anthropic, GitHub Copilot, and OpenRouter
- **GitHub Integration**: Built-in GitHub OAuth authentication for Copilot access
- **Cross-Platform**: Desktop application for macOS, Windows, and Linux
- **Modern UI**: React-based frontend with Tailwind CSS and theme support
- **Real-time Communication**: Streaming responses and task management
- **Conversation History**: Persistent conversation tracking across sessions

## Tech Stack

- **Backend**: Go with Wails v2 framework
- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS v4 with custom theme system
- **UI Components**: Radix UI primitives
- **State Management**: Zustand
- **Routing**: React Router v7
- **Build Tool**: Vite
- **Package Manager**: pnpm

## Project Structure

```
nuvin-agent/
├── agent-client/          # A2A client SDK example
│   ├── client.ts         # Example A2A client implementation
│   └── package.json      # Client dependencies
├── nuvin-ui/             # Main Wails application
│   ├── app.go           # Go backend application logic
│   ├── main.go          # Wails application entry point
│   ├── wails.json       # Wails configuration
│   └── frontend/        # React frontend
│       ├── src/
│       │   ├── components/    # Reusable UI components
│       │   ├── lib/          # Core libraries and utilities
│       │   │   ├── agents/   # Agent implementations
│       │   │   └── providers/ # LLM provider integrations
│       │   ├── modules/      # Feature modules
│       │   ├── store/        # Zustand state stores
│       │   └── types/        # TypeScript type definitions
│       └── package.json      # Frontend dependencies
├── main.go              # Root Go module
└── go.mod              # Go module definition
```

## Installation

### Prerequisites

- Go 1.24.4 or later
- Node.js 18+ and pnpm
- Wails v2 CLI tool

### Setup

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd nuvin-agent
   ```

2. **Install Wails CLI** (if not already installed):

   ```bash
   go install github.com/wailsapp/wails/v2/cmd/wails@latest
   ```

3. **Install frontend dependencies**:
   ```bash
   cd nuvin-ui/frontend
   pnpm install
   ```

## Development

### Running in Development Mode

```bash
cd nuvin-ui
wails dev
```

This will start the application in development mode with hot reload for both Go backend and React frontend.

### Building for Production

```bash
cd nuvin-ui
wails build
```

The built application will be available in the `build/bin` directory.

### Frontend Development

To work on the frontend independently:

```bash
cd nuvin-ui/frontend
pnpm dev
```

### Code Formatting

```bash
cd nuvin-ui/frontend
pnpm format
```

## Usage

### Setting Up Providers

1. **OpenAI**: Add your OpenAI API key in the provider settings
2. **Anthropic**: Configure your Anthropic API key
3. **GitHub Copilot**: Use the built-in OAuth flow to authenticate
4. **OpenRouter**: Add your OpenRouter API key

### Adding Agents

- **Local Agents**: Use configured LLM providers for direct API calls
- **Remote Agents**: Connect to A2A-compatible agent endpoints with optional authentication

### Features

- **Chat Interface**: Send messages and receive streaming responses
- **Model Selection**: Switch between different models within providers
- **Conversation Management**: Track and manage multiple conversation threads
- **Task Management**: Monitor and control long-running agent tasks
- **Theme Support**: Light and dark theme options

## Architecture

### Backend (Go)

- **FetchProxy**: Handles HTTP requests from frontend, bypassing CORS restrictions
- **GitHub OAuth**: Implements device flow authentication for GitHub Copilot
- **Wails Integration**: Provides secure bridge between Go backend and React frontend

### Frontend (React)

- **Agent Manager**: Central service for managing agents and message routing
- **Provider System**: Modular provider implementations for different LLM services
- **A2A Integration**: Support for Agent-to-Agent protocol communication
- **State Management**: Reactive state using Zustand stores

### Key Components

- **AgentManager**: Coordinates between local and remote agents
- **Provider Classes**: Handle API communication with different LLM services
- **A2A Client**: Implements Agent-to-Agent protocol for remote agents
- **Conversation Store**: Manages chat history and message state

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and ensure code quality
5. Submit a pull request

## License

© 2025 Marsch Huynh <marsch.huynh@gmail.com>

## Support

For issues and questions, please use the GitHub issue tracker.
