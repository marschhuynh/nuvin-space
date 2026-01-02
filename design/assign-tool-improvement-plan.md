# AssignTool Improvement Plan

## Overview

This document outlines the improvements needed to enhance the `AssignTool` based on the reference design document. The goal is to add background execution, session resumption, better documentation, and a companion `TaskOutput` tool.

---

## Current State Analysis

### Existing Implementation (`AssignTool.ts`)

**Parameters:**
- `agent` (required): Agent ID from registry
- `task` (required): Detailed task description
- `description` (required): Short summary (5-10 words)

**Features:**
- Synchronous execution only
- Basic error handling with metadata
- Dynamic description generation from registry
- Enabled/disabled agent filtering

**Limitations:**
- No background/async execution
- No session resumption capability
- No visibility into agent tools
- No usage examples in description
- No anti-pattern guidance

---

## Current Memory Architecture

### How Memory Works Now

The CLI uses a `MemoryPort<Message>` interface for storing conversation history:

```typescript
// packages/nuvin-core/src/ports.ts
export interface MemoryPort<T = unknown> {
  get(key: string): Promise<T[]>;
  set(key: string, items: T[]): Promise<void>;
  append(key: string, items: T[]): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
  clear(): Promise<void>;
}
```

### Current Storage Structure

Main agent stores messages under the key `"cli"`:

```json
// history.json
{
  "cli": [
    { "id": "...", "role": "user", "content": "...", "timestamp": "..." },
    { "id": "...", "role": "assistant", "content": "...", "tool_calls": [...] },
    { "id": "...", "role": "tool", "content": "...", "tool_call_id": "..." }
  ]
}
```

### Sub-Agent Memory (Current)

Sub-agents use **separate in-memory storage** that is discarded after execution:

```typescript
// packages/nuvin-core/src/agent-manager.ts:84-89
const memory = new InMemoryMemory<Message>();

if (config.shareContext && config.delegatingMemory && config.delegatingMemory.length > 0) {
  await memory.set('default', config.delegatingMemory);
}
```

**Problems:**
1. Sub-agent conversation history is lost after execution
2. Cannot resume sub-agent sessions
3. No visibility into what sub-agents did (only final result)
4. `delegatingMemory` is always `undefined` (TODO in code)

---

## Proposed Memory Structure for Sub-Agents

### Storage Key Convention

Store sub-agent messages alongside main agent using prefixed keys:

```json
// history.json
{
  "cli": [...],                           // Main agent messages
  "agent:code-investigator:abc123": [...], // Sub-agent session
  "agent:testing-specialist:xyz789": [...] // Another sub-agent session
}
```

**Key Format:** `agent:{agent_type}:{session_id}`

### Sub-Agent Session Metadata

Store session metadata separately:

```json
// history.json
{
  "cli": [...],
  "agent:code-investigator:abc123": [...],
  "__agent_sessions__": [
    {
      "id": "abc123",
      "agentType": "code-investigator",
      "state": "completed",
      "parentConversationId": "cli",
      "startTime": 1704067200000,
      "endTime": 1704067260000,
      "taskDescription": "Analyze auth flow",
      "result": "Found 3 auth endpoints...",
      "metrics": { "tokensUsed": 5000, "toolCalls": 12 }
    }
  ]
}
```

### Integration with Existing Memory

```typescript
// Proposed changes to AgentManager

class AgentManager {
  constructor(
    private delegatingConfig: AgentConfig,
    private delegatingTools: ToolPort,
    private sharedMemory: MemoryPort<Message>,  // NEW: shared memory reference
    private llmFactory?: LLMFactory,
    // ...
  ) {}

  async executeTask(config: SpecialistAgentConfig, signal?: AbortSignal) {
    const sessionKey = `agent:${config.agentType}:${config.agentId}`;
    
    // Check if resuming existing session
    if (config.resume) {
      const existingMessages = await this.sharedMemory.get(sessionKey);
      if (existingMessages.length > 0) {
        await memory.set('default', existingMessages);
      }
    }
    
    // ... execute task ...
    
    // Save sub-agent history to shared memory
    const finalHistory = await memory.get('default');
    await this.sharedMemory.set(sessionKey, finalHistory);
    
    // Update session metadata
    await this.updateSessionMetadata(config.agentId, {
      state: 'completed',
      endTime: Date.now(),
      result: response.content,
    });
  }
}
```

---

## Proposed Improvements

### 1. New Parameters for AssignTool

#### 1.1 `run_in_background` Parameter

```typescript
run_in_background?: boolean
```

**Purpose:** Allow agents to run asynchronously while the main agent continues working.

**Behavior:**
- When `true`: Launch agent in background, immediately return agent ID
- When `false` (default): Wait for agent completion (current behavior)

**Return Value (background mode):**
```typescript
{
  status: 'success',
  type: 'text',
  result: 'Agent launched in background with ID: abc123',
  metadata: {
    agentId: 'abc123',
    runningInBackground: true,
    taskDescription: '...'
  }
}
```

#### 1.2 `resume` Parameter

```typescript
resume?: string  // Agent ID from previous invocation
```

**Purpose:** Continue a previous agent session with full context preserved.

**Behavior:**
- When provided: Resume the agent with given ID, skip creating new session
- Agent continues with its full previous context
- Can be combined with additional task instructions

**Implementation Requirements:**
- Agent state persistence (in-memory or file-based)
- Session tracking with unique IDs
- Context preservation mechanism

### 2. New Tool: TaskOutput

Create a new tool to retrieve results from background agents.

**Location:** `packages/nuvin-core/src/tools/TaskOutputTool.ts`

**Parameters:**
```typescript
{
  agent_id: string;       // Required: ID of the background agent
  blocking?: boolean;     // Optional: Wait for completion (default: false)
  timeout_ms?: number;    // Optional: Max wait time in blocking mode
}
```

**Return Values:**

```typescript
// Agent still running
{
  status: 'success',
  type: 'text',
  result: 'Agent is still running...',
  metadata: { agentId: 'abc123', state: 'running' }
}

// Agent completed
{
  status: 'success',
  type: 'text',
  result: '<agent output>',
  metadata: { agentId: 'abc123', state: 'completed', metrics: {...} }
}

// Agent failed
{
  status: 'error',
  error: 'Agent failed: <reason>',
  metadata: { agentId: 'abc123', state: 'failed' }
}
```

### 3. Agent State Manager

Create a service to track agent sessions.

**Location:** `packages/nuvin-core/src/delegation/AgentStateManager.ts`

```typescript
interface AgentSession {
  id: string;
  agentType: string;
  parentConversationId: string;  // e.g., "cli"
  state: 'pending' | 'running' | 'completed' | 'failed';
  taskDescription: string;
  startTime: number;
  endTime?: number;
  result?: string;
  error?: string;
  metrics?: DelegationMetadata;
}

interface AgentStateManager {
  // Session lifecycle
  create(agentType: string, parentConvoId: string, taskDescription: string): string;
  get(sessionId: string): AgentSession | undefined;
  update(sessionId: string, updates: Partial<AgentSession>): void;
  
  // Queries
  getRunning(): AgentSession[];
  getByParent(parentConvoId: string): AgentSession[];
  
  // Persistence
  load(memory: MemoryPort<AgentSession>): Promise<void>;
  save(memory: MemoryPort<AgentSession>): Promise<void>;
  
  // Cleanup
  cleanup(maxAgeMs: number): void;
}
```

### 4. Agent Session Store

Utility for storing/retrieving sub-agent conversation history.

**Location:** `packages/nuvin-core/src/delegation/AgentSessionStore.ts`

```typescript
class AgentSessionStore {
  constructor(private memory: MemoryPort<Message>) {}
  
  // Get storage key for a session
  private getKey(agentType: string, sessionId: string): string {
    return `agent:${agentType}:${sessionId}`;
  }
  
  // Store sub-agent messages
  async saveSession(agentType: string, sessionId: string, messages: Message[]): Promise<void> {
    const key = this.getKey(agentType, sessionId);
    await this.memory.set(key, messages);
  }
  
  // Retrieve sub-agent messages (for resume)
  async getSession(agentType: string, sessionId: string): Promise<Message[]> {
    const key = this.getKey(agentType, sessionId);
    return this.memory.get(key);
  }
  
  // List all sessions for an agent type
  async listSessions(agentType?: string): Promise<string[]> {
    const keys = await this.memory.keys();
    return keys
      .filter(k => k.startsWith('agent:'))
      .filter(k => !agentType || k.startsWith(`agent:${agentType}:`))
      .map(k => k.split(':')[2]);
  }
  
  // Delete a session
  async deleteSession(agentType: string, sessionId: string): Promise<void> {
    const key = this.getKey(agentType, sessionId);
    await this.memory.delete(key);
  }
}
```

### 4. Enhanced Description Generation

#### 4.1 Tools Visibility

Show which tools each agent has access to:

```typescript
// Current format
`- code-investigator: Use this agent when you need to investigate codebases...`

// Enhanced format
`- code-investigator: Use this agent when you need to investigate codebases...
  (Tools: Glob, Grep, Read, WebFetch, WebSearch)`
```

#### 4.2 Usage Examples

Add examples for each agent type in the description:

```typescript
const agentExamples: Record<string, string> = {
  'code-investigator': `
<example>
user: "How does the authentication flow work in this codebase?"
assistant: <Uses assign_task with code-investigator>
</example>`,
  // ... more examples
};
```

#### 4.3 Anti-Pattern Guidance

Add "When NOT to use" section:

```markdown
When NOT to use the assign_task tool:
- If you want to read a specific file path, use file_read instead
- If you are searching for a specific class definition like "class Foo", use grep_tool instead
- If you are searching for code within a specific file or 2-3 files, use file_read instead
- For simple, single-step tasks that don't require specialist knowledge
```

### 5. Updated Parameter Schema

```typescript
parameters = {
  type: 'object',
  properties: {
    description: {
      type: 'string',
      description: 'A summary of the task (5-10 words).',
    },
    agent: {
      type: 'string',
      description: 'Agent ID from registry (e.g., "code-reviewer", "researcher")',
    },
    task: {
      type: 'string',
      description: 'Detailed description of the task to be performed.',
    },
    run_in_background: {
      type: 'boolean',
      description: 'Run agent in background, return immediately with agent ID. Use TaskOutput to retrieve results.',
      default: false,
    },
    resume: {
      type: 'string',
      description: 'Agent ID from previous invocation to resume. Agent continues with full previous context.',
    },
  },
  required: ['agent', 'task', 'description'],
} as const;
```

---

## Implementation Plan

### Phase 1: Foundation (Priority: High)

1. **Create AgentStateManager**
   - `packages/nuvin-core/src/delegation/AgentStateManager.ts`
   - In-memory session tracking
   - Session lifecycle management

2. **Update AgentManager to use shared memory**
   - Pass `sharedMemory: MemoryPort<Message>` to constructor
   - Store sub-agent messages with key `agent:{type}:{id}`
   - Store session metadata under `__agent_sessions__`

3. **Update AssignParams type**
   - Add `run_in_background?: boolean`
   - Add `resume?: string`
   - Update `packages/nuvin-core/src/agent-types.ts`

4. **Update AssignTool parameters**
   - Add new parameters to schema
   - Update execute() for background mode

### Phase 2: Background Execution (Priority: High)

4. **Implement background agent launching**
   - Modify `DefaultDelegationService.delegate()`
   - Return early with session ID for background mode
   - Track running agents in state manager

5. **Create TaskOutputTool**
   - `packages/nuvin-core/src/tools/TaskOutputTool.ts`
   - Query agent state manager
   - Support blocking mode with timeout

6. **Register TaskOutput tool**
   - Add to tool registry
   - Export from index

### Phase 3: Session Resumption (Priority: High)

7. **Implement context preservation**
   - Store conversation context in session
   - Handle resume parameter in execute()

8. **Update agent factory for resumption**
   - `DefaultSpecialistAgentFactory.create()` should handle resume context

### Phase 4: Enhanced Documentation (Priority: Medium)

9. **Add tools visibility**
   - Extend `CompleteAgent` type with tools list
   - Update `definition()` to include tools per agent

10. **Add usage examples**
    - Create examples registry
    - Include in description generation

11. **Add anti-pattern guidance**
    - Add static "When NOT to use" section
    - Update description template

### Phase 5: Testing & Polish (Priority: Medium)

12. **Unit tests**
    - AgentStateManager tests
    - TaskOutputTool tests
    - Background execution tests
    - Resume functionality tests

13. **Integration tests**
    - Full background workflow
    - Resume workflow
    - Error handling scenarios

---

## File Changes Summary

### New Files

| File | Description |
|------|-------------|
| `src/delegation/AgentStateManager.ts` | Agent session tracking & metadata |
| `src/delegation/AgentSessionStore.ts` | Persistence for sub-agent sessions |
| `src/tools/TaskOutputTool.ts` | Retrieve background agent results |
| `src/tests/agent-state-manager.test.ts` | Unit tests |
| `src/tests/task-output-tool.test.ts` | Unit tests |

### Modified Files

| File | Changes |
|------|---------|
| `src/agent-types.ts` | Add `run_in_background`, `resume` to AssignParams |
| `src/agent-manager.ts` | Use shared memory, persist sub-agent history |
| `src/tools/AssignTool.ts` | New parameters, background mode, resume support |
| `src/delegation/DefaultDelegationService.ts` | Background execution, state tracking |
| `src/delegation/types.ts` | New interfaces for state management |
| `src/tools.ts` | Register TaskOutputTool, pass shared memory |
| `src/index.ts` | Export new types and tools |

---

## Memory Storage Examples

### Before (Current)

```json
// history.json - sub-agent history is LOST after execution
{
  "cli": [
    { "role": "user", "content": "Analyze the auth system" },
    { "role": "assistant", "tool_calls": [{ "name": "assign_task", ... }] },
    { "role": "tool", "content": "Agent found 3 auth endpoints..." }
  ]
}
```

### After (Proposed)

```json
// history.json - sub-agent history is PRESERVED
{
  "cli": [
    { "role": "user", "content": "Analyze the auth system" },
    { "role": "assistant", "tool_calls": [{ "name": "assign_task", ... }] },
    { "role": "tool", "content": "Agent found 3 auth endpoints...", "metadata": { "agentSessionId": "abc123" } }
  ],
  "agent:code-investigator:abc123": [
    { "role": "user", "content": "Analyze the authentication system architecture" },
    { "role": "assistant", "tool_calls": [{ "name": "grep_tool", ... }] },
    { "role": "tool", "content": "Found matches in auth/*.ts..." },
    { "role": "assistant", "content": "Found 3 auth endpoints..." }
  ],
  "__agent_sessions__": [
    {
      "id": "abc123",
      "agentType": "code-investigator", 
      "parentConversationId": "cli",
      "state": "completed",
      "taskDescription": "Analyze the authentication system architecture",
      "startTime": 1704067200000,
      "endTime": 1704067260000
    }
  ]
}
```

---

## Wiring Changes (CLI Integration)

### OrchestratorManager Changes

The CLI's `OrchestratorManager` needs to pass shared memory to `AgentManager`:

```typescript
// packages/nuvin-cli/source/services/OrchestratorManager.ts

// Current: AgentManager uses its own InMemoryMemory
const agentManager = new AgentManager(
  delegatingConfig,
  delegatingTools,
  llmFactory,
  eventCallback,
);

// Proposed: Pass shared memory for session persistence
const agentManager = new AgentManager(
  delegatingConfig,
  delegatingTools,
  this.memory,  // Shared MemoryPort - same as main agent
  llmFactory,
  eventCallback,
);
```

### Tools.ts Changes

The `ToolRegistry` needs to provide shared memory to delegation service:

```typescript
// packages/nuvin-core/src/tools.ts

class ToolRegistry {
  constructor(opts?: {
    // ... existing options
    sharedMemory?: MemoryPort<Message>;  // NEW
  }) {
    // Pass to delegation service factory
    this.delegationService = createDelegationService({
      agentRegistry: this.agentRegistry,
      sharedMemory: opts?.sharedMemory,  // NEW
    });
  }
}
```

---

## API Examples

### Background Execution

```typescript
// Launch agent in background
const result = await assignTool.execute({
  agent: 'code-investigator',
  task: 'Analyze the authentication system architecture',
  description: 'Analyze auth architecture',
  run_in_background: true,
});
// result.metadata.agentId = 'agent-abc123'

// Continue with other work...

// Later, retrieve results
const output = await taskOutputTool.execute({
  agent_id: 'agent-abc123',
  blocking: true,
  timeout_ms: 60000,
});
```

### Session Resumption

```typescript
// First invocation
const result1 = await assignTool.execute({
  agent: 'code-investigator',
  task: 'Find all API endpoints in the codebase',
  description: 'Find API endpoints',
});
// result1.metadata.agentId = 'agent-xyz789'

// Later, resume with follow-up
const result2 = await assignTool.execute({
  agent: 'code-investigator',
  task: 'Now analyze the security of those endpoints',
  description: 'Analyze endpoint security',
  resume: 'agent-xyz789',
});
```

### Parallel Agents

```typescript
// Launch multiple agents in parallel (single message with multiple tool calls)
const [reviewer, tester] = await Promise.all([
  assignTool.execute({
    agent: 'code-reviewer',
    task: 'Review the new payment module',
    description: 'Review payment module',
    run_in_background: true,
  }),
  assignTool.execute({
    agent: 'testing-specialist',
    task: 'Generate tests for the new payment module',
    description: 'Generate payment tests',
    run_in_background: true,
  }),
]);

// Wait for both to complete
const [reviewResult, testResult] = await Promise.all([
  taskOutputTool.execute({ agent_id: reviewer.metadata.agentId, blocking: true }),
  taskOutputTool.execute({ agent_id: tester.metadata.agentId, blocking: true }),
]);
```

---

## Success Criteria

- [ ] Background agents can be launched and results retrieved later
- [ ] Agent sessions can be resumed with full context
- [ ] Tool description shows available tools per agent
- [ ] Usage examples are included in description
- [ ] Anti-pattern guidance prevents misuse
- [ ] All existing tests pass
- [ ] New functionality has comprehensive test coverage
- [ ] No breaking changes to existing API (all new params are optional)
