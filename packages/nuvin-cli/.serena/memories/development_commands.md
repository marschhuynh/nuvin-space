# Development Commands: nuvin-cli

## Package Commands
```bash
# Install dependencies
pnpm install

# Build the project
pnpm run build

# Clean build artifacts
pnpm run clean

# Development mode with watch
pnpm run dev

# Run in development mode with inspector
pnpm run run:dev

# Run production build
pnpm run run:prod

# Lint code
pnpm run lint

# Format code
pnpm run format
```

## Development Testing
```bash
# Run with echo provider (default)
node dist/cli.js

# Run with specific provider and model
node dist/cli.js --provider openrouter --model openai/gpt-4o

# Run with memory persistence
node dist/cli.js --mem-persist

# Run with tool approval enabled
node dist/cli.js --require-approval

# Run development with inspector enabled
INK_ENABLE_INSPECTOR=1 DEV=true npx tsx source/cli.tsx
```

## Configuration Options
```bash
# Provider selection
--provider {openrouter|github|zai|echo}

# Model specification
--model <model_name>

# API key (or use environment variables)
--api-key <api_key>

# Memory persistence
--mem-persist

# MCP configuration file
--mcp-config <path>

# Tool approval requirement
--require-approval
```

## Environment Variables
```bash
# OpenRouter API key
OPENROUTER_API_KEY=your_key

# Zai API key
ZAI_API_KEY=your_key

# GitHub access token
GITHUB_ACCESS_TOKEN=your_token

# Enable ink inspector for debugging
INK_ENABLE_INSPECTOR=1

# Development mode
DEV=true
```

## Git Commands
```bash
# View recent changes
git log --oneline -10

# Check current status
git status

# View staged changes
git diff --staged

# View unstaged changes
git diff
```

## System Commands (Darwin/macOS)
```bash
# List files
ls -la

# Find files
find . -name "*.ts" -type f

# Search in files
grep -r "search_term" source/

# Remove node_modules
rm -rf node_modules dist

# Clean npm cache
npm cache clean --force

# Check Node version
node --version

# Check pnpm version
pnpm --version
```

## Debugging Commands
```bash
# Enable debug logging
DEBUG=* node dist/cli.js

# Check TypeScript configuration
npx tsc --showConfig

# Validate package.json
npx validate-package-json

# Test biome configuration
npx biome check .

# Run biome in dry-run mode
npx biome lint --dry-run
```

## Workspace Commands (Monorepo)
```bash
# Install all workspace dependencies
pnpm install

# Build workspace
pnpm -r build

# Run scripts in specific workspace
pnpm --filter @nuvin/cli <command>

# Check workspace dependencies
pnpm why <package_name>
```