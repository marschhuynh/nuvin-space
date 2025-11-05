# @nuvin/cli

Interactive AI coding assistant CLI powered by Nuvin core. Transform your natural language requests into automated coding tasks with intelligent AI agent workflows.

## Features

- **🤖 Multi-Provider AI Support** - GitHub Models, OpenRouter, ZAI, Anthropic, and Echo providers
- **👥 Multi-Agent System** - Delegate tasks to specialist agents (code reviewer, tester, architect, etc.)
- **🛠️ Rich Toolset** - File operations, web search, bash execution, and MCP integration
- **💬 Memory Management** - Conversation history persistence and in-memory context
- **🔧 Configuration Management** - Layered config system with CLI overrides (global, local, explicit, env, direct)
- **🎯 Tool Approval** - Optional manual approval before executing tools (sudo mode)
- **📝 Built-in Commands** - Session management, auth, history, agents, and more
- **🎨 Theme System** - Customizable terminal themes

## Installation

```bash
# Install globally
npm install --global @nuvin/nuvin-cli

# Or use with npx
npx @nuvin/nuvin-cli

# Or install in project
pnpm add @nuvin/nuvin-cli
```

## Quick Start

```bash
# Start with default provider
nuvin

# Use OpenRouter
nuvin --provider openrouter --model minimax/minimax-m2:free

# Use Anthropic Claude
nuvin --provider anthropic --model claude-sonnet-4-5

# Use GitHub Models
nuvin --provider github --model claude-sonnet-4.5

# Use configuration file
nuvin --config ./my-config.yaml
```

## CLI Usage

```bash
# Start with default provider
nuvin

# Use OpenRouter with specific model
nuvin --provider openrouter --model openai/gpt-4o

# Use Anthropic Claude
nuvin --provider anthropic --model claude-sonnet-4-5

# Use GitHub Models
nuvin --provider github --model claude-sonnet-4.5

# Enable conversation persistence
nuvin --mem-persist

# Use configuration file
nuvin --config ./my-config.yaml
```

## Environment Variables

Set up authentication via environment variables:

```bash
# AI Provider Authentication
export OPENROUTER_API_KEY=sk-or-xxxxxxxx
export ANTHROPIC_API_KEY=sk-ant-xxxxxxxx
export GITHUB_ACCESS_TOKEN=ghp_xxxxxxxxxxxx

# Optional Tool Configuration
export GOOGLE_CSE_KEY=your_google_cse_key
export GOOGLE_CSE_CX=your_search_engine_id
```

## What You Can Do

### Development & Code Analysis
- "Analyze my project structure and provide optimization recommendations"
- "Review the recent git commits and summarize changes"
- "Find all TODO comments in my codebase"
- "Set up automated testing for my codebase"
- "Refactor this function to follow SOLID principles"

### Multi-Agent Delegation
- "Delegate code review to the specialist agent"
- "Create a comprehensive test suite for this module"
- "Research documentation for this API and create usage examples"
- "Organize my git changes into conventional commits"
- "Have the architect review this design and suggest improvements"

## Documentation

- **[Configuration Guide](docs/configuration.md)** - Detailed configuration system documentation
- **[Commands Reference](docs/commands.md)** - Built-in commands and usage examples
- **[MCP Integration](docs/mcp-integration.md)** - Model Context Protocol setup and usage
- **[Specialist Agents](docs/agents.md)** - Multi-agent system and delegation guide
- **[Development Guide](docs/development.md)** - Contributing and development workflow

## License

MIT © Marsch Huynh
