---
"@nuvin/nuvin-cli": major
"@nuvin/nuvin-core": major
---

**BREAKING CHANGE:** Sub-agent delegation API signatures changed

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
  delegatingTools,        // llm parameter removed
  llmFactory,
  eventCallback,
  configResolver          // new parameter
);

// Update setOrchestrator calls
toolRegistry.setOrchestrator(
  config,
  tools,                  // llm parameter removed
  llmFactory,
  configResolver          // new parameter
);
```

Most users won't be affected as these are internal APIs. The `assign_task` tool works the same as before.
