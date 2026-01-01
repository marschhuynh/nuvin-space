# assign_tool Analysis

This document provides a comprehensive analysis of the `assign_tool` implementation in Nuvin CLI, covering architecture, concurrent execution, UI display, memory management, and LLM interaction.

## Table of Contents

1. [How assign_tool Works](#how-assign_tool-works)
2. [Can CLI Run Multiple Agents Simultaneously](#can-cli-run-multiple-agents-simultaneously)
3. [UI Display for Concurrent Agents](#ui-display-for-concurrent-agents)
4. [Memory Management Per Agent](#memory-management-per-agent)
5. [Is It Easy for LLM to Start Multiple Agents](#is-it-easy-for-llm-to-start-multiple-agents)

---

## How assign_tool Works

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Main Agent                                │
│                  (AgentOrchestrator)                             │
│                                                                 │
│    LLM generates assign_tool call                                │
│              ↓                                                   │
│    ┌─────────────────────────────────────────────────────────┐  │
│    │                    AssignTool.execute()                  │  │
│    │  - Validates agent and task parameters                  │  │
│    │  - Delegates to DelegationService                       │  │
│    └─────────────────────────────────────────────────────────┘  │
│              ↓                                                   │
│    ┌─────────────────────────────────────────────────────────┐  │
│    │               DefaultDelegationService                   │  │
│    │  - Looks up agent template from catalog                 │  │
│    │  - Evaluates delegation policy                          │  │
│    │  - Creates SpecialistAgentConfig                        │  │
│    └─────────────────────────────────────────────────────────┘  │
│              ↓                                                   │
│    ┌─────────────────────────────────────────────────────────┐  │
│    │            AgentManagerCommandRunner                     │  │
│    │  - Creates new AgentManager instance                    │  │
│    └─────────────────────────────────────────────────────────┘  │
│              ↓                                                   │
│    ┌─────────────────────────────────────────────────────────┐  │
│    │                    AgentManager                          │  │
│    │  - Creates isolated AgentOrchestrator for sub-agent     │  │
│    │  - Executes task with fresh memory/LLM                  │  │
│    │  - Emits events for UI tracking                         │  │
│    │  - Returns result with metrics                          │  │
│    └─────────────────────────────────────────────────────────┘  │
```

### Tool Definition (packages/nuvin-core/src/tools/AssignTool.ts)

```typescript
parameters = {
  type: 'object',
  properties: {
    description: {
      type: 'string',
      description: 'A summary of the task to be performed. From 5-10 words.',
    },
    agent: {
      type: 'string',
      description: 'Agent ID from registry (e.g., "code-reviewer", "researcher")',
    },
    task: {
      type: 'string',
      description: 'Detailed description of the task to be performed.',
    },
  },
  required: ['agent', 'task', 'description'],
}
```

### Execution Flow

1. **Parameter Validation** - Ensures `agent`, `task`, and `description` are present
2. **Agent Lookup** - Retrieves agent template from `AgentCatalog`
3. **Policy Check** - Evaluates `DelegationPolicy` for permission
4. **Config Creation** - Generates `SpecialistAgentConfig` via factory
5. **Sub-Agent Execution** - Creates isolated `AgentOrchestrator` with:
   - Fresh `InMemoryMemory` (empty by default)
   - New LLM instance via `LLMFactory`
   - Same tool access as parent
6. **Result Return** - Returns summary, metrics (tokens, cost, duration), tool calls

### Return Type

```typescript
type AssignSuccessResult = {
  status: 'success';
  type: 'text';
  result: string;              // Agent's response summary
  metadata: {
    agentId: string;
    agentName: string;
    toolCallsExecuted: number;
    executionTimeMs: number;
    metrics?: MetricsSnapshot; // tokens, cost, llmCallCount
  };
};
```

---

## Can CLI Run Multiple Agents Simultaneously?

### Sequential vs Concurrent Execution

| Level | Behavior |
|-------|----------|
| **Single assign_tool call** | One sub-agent runs at a time |
| **Multiple assign_tool calls in same response** | Concurrent (up to `maxToolConcurrency`) |
| **Nested assign_tool (delegation depth)** | Sequential per path, max depth = 3 |

### Concurrency Implementation (packages/nuvin-core/src/tools.ts)

```typescript
async executeToolCalls(
  calls: ToolInvocation[],
  context?: Record<string, unknown>,
  maxConcurrent = 3,  // Default concurrency
  signal?: AbortSignal,
): Promise<ToolExecutionResult[]> {
  const results: ToolExecutionResult[] = [];
  for (let i = 0; i < calls.length; i += maxConcurrent) {
    const batch = calls.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map(async (c) => { ... })  // Parallel execution!
    );
    results.push(...batchResults);
  }
  return results;
}
```

### Main Agent Configuration (packages/nuvin-cli/source/services/OrchestratorManager.ts)

```typescript
const agentConfig = {
  id: 'nuvin-agent',
  enabledTools: [...],
  maxToolConcurrency: 3,  // Controls concurrent tool calls including assign_task
};
```

### Execution Diagram

```
LLM Response with multiple assign_tool calls:
┌────────────────────────────────────────────────────────────┐
│ {                                                          │
│   "tool_calls": [                                          │
│     { "id": "call_1", "function": { "name": "assign_task", ... } },  │
│     { "id": "call_2", "function": { "name": "assign_task", ... } },  │
│     { "id": "call_3", "function": { "name": "assign_task", ... } }   │
│   ]                                                        │
│ }                                                          │
└────────────────────────────────────────────────────────────┘
                           ↓
              executeToolCalls(batch size=3, maxConcurrent=3)
                           ↓
        ┌──────────────────┴──────────────────┐
        ↓                                       ↓
  assign_task call_1                     assign_task call_2
  (AgentManager #1)                      (AgentManager #2)
        ↓                                       ↓
  [Parallel execution via Promise.all]        ↓
        │                               assign_task call_3
        │                               (AgentManager #3)
        └──────────────────┬──────────────────┘
                           ↓
              All 3 agents running simultaneously
```

### Key Points

- **Yes, multiple sub-agents can run concurrently**
- Maximum concurrent calls controlled by `maxToolConcurrency` (default: 3)
- Each sub-agent creates its own `AgentManager` instance
- Each sub-agent has isolated resources (memory, LLM, metrics)

---

## UI Display for Concurrent Agents

### Event-Driven State Management

```
┌─────────────────────────────────────────────────────────────────┐
│                      Event Flow                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  AgentManager.executeTask()                                     │
│        ↓                                                        │
│  emit SubAgentStarted (agentId, toolCallId)                     │
│        ↓                                                        │
│  emit SubAgentToolCall (toolName, arguments)                    │
│        ↓                                                        │
│  emit SubAgentToolResult (status, durationMs)                   │
│        ↓                                                        │
│  emit SubAgentMetrics (tokens, cost, llmCallCount)              │
│        ↓                                                        │
│  emit SubAgentCompleted (finalStatus, resultMessage)            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Tool Call to Message ID Mapping (packages/nuvin-cli/source/utils/eventProcessor.ts)

```typescript
case AgentEventTypes.ToolCalls: {
  const messageId = crypto.randomUUID();
  // Store mapping: toolCallId → messageId
  const newToolCallToMessageMap = new Map(state.toolCallToMessageMap);
  for (const call of enrichedToolCalls) {
    newToolCalls.set(call.id, call);
    newToolCallToMessageMap.set(call.id, messageId);
  }
  return { ...state, toolCallToMessageMap: newToolCallToMessageMap };
}
```

### SubAgentState Storage

Each sub-agent's state is stored in **message metadata** using a unique key:

```typescript
// Dynamic key pattern: subAgentState_${toolCallId}
callbacks.updateLineMetadata?.(toolCallMessageId, {
  [`subAgentState_${event.toolCallId}`]: subAgentState,
});
```

### SubAgentState Type (packages/nuvin-core/src/sub-agent-types.ts)

```typescript
type SubAgentState = {
  agentId: string;
  agentName: string;
  status: 'starting' | 'running' | 'completed';
  toolCalls: SubAgentToolCall[];
  resultMessage?: string;
  totalDurationMs?: number;
  finalStatus?: 'success' | 'error' | 'timeout';
  toolCallMessageId?: string;
  toolCallId?: string;           // Links to specific assign_tool call
  metrics?: MetricsSnapshot;     // Live metrics
};
```

### Rendering in MessageLine (packages/nuvin-cli/source/components/MessageLine.tsx)

```typescript
case 'tool': {
  for (const toolCall of toolCalls) {
    if (toolCall.function.name === 'assign_task') {
      // Look up sub-agent state using dynamic key
      const subAgentState = message.metadata?.[`subAgentState_${toolCall.id}`];
      return <SubAgentActivity toolCall={toolCall} subAgentState={subAgentState} ... />;
    }
  }
}
```

### SubAgentActivity Component (packages/nuvin-cli/source/components/ToolResultView/SubAgentActivity.tsx)

```typescript
export const SubAgentActivity: React.FC<SubAgentActivityProps> = ({
  toolCall,
  subAgentState,
}) => {
  // Shows:
  // - Agent name and task description
  // - Live timer
  // - Nested tool calls with status icons (✓/✗)
  // - Real-time metrics (tokens, cost, LLM calls)
  // - Final result when completed
};
```

### Visual Output Example

```
» Tool (3 tool calls)
│
├─ ► Code Reviewer (Review security code)
│   ├─ ✓ file_read src/auth.ts (120ms)
│   ├─ ✓ grep_tool pattern="password" (80ms)
│   ├─ ✗ web_search CVE-2024 (200ms)
│   └─ Working... 2.5s • 1 call • 500 tokens • $0.002
│
├─ ► Bug Finder (Find bugs in core)
│   ├─ ✓ grep_tool "TODO" (50ms)
│   └─ Working... 1.2s • 200 tokens • $0.001
│
└─ ► Docs Writer (Update API docs)
    └─ Working... 0.8s • 100 tokens • $0.0005
```

### How Concurrent Display Works

| Aspect | Implementation |
|--------|----------------|
| **State isolation** | Each sub-agent stored with `subAgentState_${toolCallId}` key |
| **Independent updates** | Events update only the relevant sub-agent state entry |
| **Independent rendering** | Each `SubAgentActivity` component subscribes to its own state |
| **Multiple visible** | All components render in the same message, updating live |

---

## Memory Management Per Agent

### Memory Isolation Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Main Agent Memory                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ conversation history, tool results, etc.                │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              ↓ (no sharing by default)
┌─────────────────────────────────────────────────────────────────┐
│                    Sub-Agent #1 Memory                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ InMemoryMemory (EMPTY at start)                         │    │
│  │ - Only sub-agent's own messages stored here             │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Sub-Agent #2 Memory                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ InMemoryMemory (EMPTY at start)                         │    │
│  │ - Completely isolated from sub-agent #1                 │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Memory Creation (packages/nuvin-core/src/agent-manager.ts)

```typescript
const memory = new InMemoryMemory<Message>();

// If context sharing is enabled, seed with delegating agent's context
if (config.shareContext && config.delegatingMemory && config.delegatingMemory.length > 0) {
  await memory.set('default', config.delegatingMemory);
}
```

### Context Sharing (Bug/TODO)

**Important Limitation:** Context sharing is **not implemented**.

In `DefaultSpecialistAgentFactory.ts`:
```typescript
return {
  // ...
  shareContext: template.shareContext ?? false,
  delegatingMemory: undefined, // TODO: provide delegating memory when available
  // ...
};
```

Even when `shareContext: true` is set in agent template, `delegatingMemory` is always `undefined`.

### Current Behavior

| Aspect | Value |
|--------|-------|
| **Sub-agent memory type** | `InMemoryMemory<Message>` |
| **Initial state** | Empty (no conversation history) |
| **Context sharing** | Not implemented (always empty) |
| **Memory after execution** | Disposed (cleanup in `finally` block) |
| **Persisted results** | Only summary returned to parent |

### Memory Lifecycle

```typescript
async executeTask(config: SpecialistAgentConfig, signal?: AbortSignal) {
  // 1. Create isolated memory
  const memory = new InMemoryMemory<Message>();

  try {
    // 2. Sub-agent executes with its own memory
    const response = await specialistOrchestrator.send(taskDescription, ...);
    return response;
  } finally {
    // 3. Cleanup - memory discarded
    this.activeAgents.delete(agentId);
    this.eventCollectors.delete(agentId);
  }
}
```

### Implications

- **No cross-agent memory**: Sub-agents cannot see each other's work
- **No parent context**: Sub-agents start with empty memory
- **Isolated execution**: Each sub-agent is completely independent
- **Summary only**: Parent receives only the result summary, not full conversation

---

## Is It Easy for LLM to Start Multiple Agents?

### Tool Definition Clarity

The `assign_tool` definition is designed for LLM understandability:

```json
{
  "name": "assign_task",
  "description": "Delegate a task to a specialist agent for focused, independent execution.\n\nAvailable agents:\n- code-reviewer: Review code for bugs and issues\n- code-security-auditor: Identify security vulnerabilities\n- researcher: Research and gather information...",
  "parameters": {
    "type": "object",
    "properties": {
      "description": "A summary of the task to be performed by the delegated agent. Be specific about desired outcome. From 5-10 words.",
      "agent": "Agent ID from registry (e.g., 'code-reviewer', 'researcher')",
      "task": "Detailed description of the task to be performed by the agent."
    },
    "required": ["agent", "task", "description"]
  }
}
```

### Why It's Easy for LLM

| Factor | Explanation |
|--------|-------------|
| **Clear parameters** | `agent`, `task`, `description` are self-explanatory |
| **Dynamic agent list** | Shows available agents with descriptions at call time |
| **Standard JSON format** | No special syntax required |
| **Independent calls** | Each `assign_tool` is a standard tool call |
| **Parallel-friendly** | LLM can generate multiple calls in one response |
| **Clear success/failure** | Each agent returns its own result |

### Example: LLM Generating Multiple Agents

**User Request:**
```
"Review the codebase for security issues, update the documentation, 
and find all TODO comments that need to be addressed."
```

**LLM Response:**
```json
{
  "tool_calls": [
    {
      "id": "call_1",
      "function": {
        "name": "assign_task",
        "arguments": {
          "agent": "code-security-auditor",
          "description": "Find security vulnerabilities",
          "task": "Review the entire codebase for security vulnerabilities including SQL injection, XSS, authentication bypass, and other common security issues. Report each finding with file path, line number, and severity."
        }
      }
    },
    {
      "id": "call_2",
      "function": {
        "name": "assign_task",
        "arguments": {
          "agent": "docs-writer",
          "description": "Update API documentation",
          "task": "Update all API documentation in docs/ directory to reflect the latest changes in the codebase. Include new endpoints, parameters, and response formats."
        }
      }
    },
    {
      "id": "call_3",
      "function": {
        "name": "assign_task",
        "arguments": {
          "agent": "bug-finder",
          "description": "Find TODO comments",
          "task": "Search for all TODO comments in the codebase using grep_tool. List each TODO with file path, line number, and the TODO content. Categorize by priority if indicated."
        }
      }
    }
  ]
}
```

### Parallel Execution Result

```
┌─────────────────────────────────────────────────────────────────┐
│                    Execution Timeline                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Time 0ms  ─────────────────────────────────────────────────────│
│            │                                                    │
│            ├─► Code Security Auditor starts                     │
│            │        │                                           │
│            ├────────┼─► Docs Writer starts                      │
│            │        │        │                                  │
│            ├────────┼────────┼─► Bug Finder starts              │
│            │        │        │        │                         │
│            │        │        │        │                         │
│            │        │        │        │                         │
│            │   2.5s │        │   1.8s │   1.2s                  │
│            │   Done │        │   Done │   Done                  │
│                                                                 │
│  Time ─────────────────────────────────────────────────────────│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### UI Display During Parallel Execution

```
» Tool (3 tool calls)
│
├─ ► Code Security Auditor (Find security vulnerabilities)
│   ├─ ✓ file_read src/auth.ts (120ms)
│   ├─ ✓ grep_tool pattern="SELECT.*FROM" (80ms)
│   └─ Working... 2.5s • 450 tokens • $0.002
│
├─ ► Docs Writer (Update API documentation)
│   └─ Working... 1.8s • 200 tokens • $0.001
│
└─ ► Bug Finder (Find TODO comments)
    ├─ ✓ grep_tool "TODO" (50ms)
    └─ Working... 1.2s • 150 tokens • $0.0008
```

### Summary

**Yes, it is very easy for LLM to start multiple agents:**

1. **Standard tool call format** - No special syntax or instructions needed
2. **Clear agent descriptions** - LLM understands what each agent does
3. **Parallel by default** - Multiple calls execute concurrently
4. **Independent results** - Each agent returns its own summary
5. **Natural workflow** - LLM naturally generates parallel calls for independent tasks

---

## Conclusion

The `assign_tool` implementation provides:

- **Easy agent delegation** with clear parameters and dynamic agent list
- **Concurrent execution** of multiple sub-agents (up to `maxToolConcurrency`)
- **Real-time UI display** with independent status updates per agent
- **Isolated memory** per sub-agent (with TODO for context sharing)
- **LLM-friendly design** that naturally supports parallel agent execution

### Current Limitations

1. **No context sharing** - Sub-agents start with empty memory
2. **No cross-agent communication** - Sub-agents are completely isolated
3. **Max delegation depth** - Limited to 3 levels to prevent infinite recursion

### Potential Enhancements

1. Implement `delegatingMemory` to pass conversation history to sub-agents
2. Add cross-agent messaging for result sharing
3. Implement agent-to-agent communication for collaborative tasks
4. Add priority/ordering control for dependent agent tasks
