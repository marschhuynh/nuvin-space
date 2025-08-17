# Moving Recursive Tool Calls to Agent Level

## Overview

We've refactored the LocalAgent to handle recursive tool calls at the agent level instead of delegating to the ToolIntegrationService. This provides better control and cleaner architecture.

## Key Changes

### Before (Service-Level Recursion)

```typescript
// Agent delegates everything to ToolIntegrationService
const result = await this.toolExecutor.processResult(result, context, provider, onToolMessage);

// ToolIntegrationService handles recursion internally
async completeToolCallingFlow(params, result, toolResults, provider, context, maxDepth = 50) {
  // Complex recursive logic mixed with tool execution
  if (finalResult.tool_calls && finalResult.tool_calls.length > 0) {
    return await this.completeToolCallingFlow(/* recursive call */);
  }
}
```

### After (Agent-Level Recursion)

```typescript
// Agent orchestrates the entire conversation flow
let currentResult = await provider.generateCompletion(context.params);
let allToolResults: ToolCallResult[] = [];
let recursionDepth = 0;

while (
  currentResult.tool_calls &&
  currentResult.tool_calls.length > 0 &&
  recursionDepth < maxRecursionDepth
) {
  // Execute tools for this round
  const toolResults = await this.toolExecutor.executeTools(
    currentResult,
    context,
    onToolMessage
  );

  // Accumulate results
  allToolResults.push(...toolResults);

  // Create follow-up messages
  const toolMessages = this.createToolResultMessages(
    currentResult.tool_calls,
    toolResults
  );

  // Get next completion
  currentResult = await provider.generateCompletion(followUpParams);
  recursionDepth++;
}
```

## Benefits

### 1. **Better Control Flow**

- **Agent orchestrates** the entire conversation
- **Clear visibility** into each recursion step
- **Easy to add logging** and monitoring at each level
- **Simple to implement timeouts** and cancellation

### 2. **Cleaner Separation of Concerns**

```typescript
// Before: Mixed responsibilities
ToolIntegrationService {
  - Execute tools ✓
  - Handle recursion ✗ (should be agent's job)
  - Manage conversation flow ✗ (should be agent's job)
  - Create follow-up messages ✗ (should be agent's job)
}

// After: Clear responsibilities
LocalAgent {
  - Orchestrate conversation flow ✓
  - Handle recursion ✓
  - Manage message history ✓
}

ToolExecutor {
  - Execute tools only ✓
}
```

### 3. **Improved Testability**

```typescript
// Before: Hard to test recursion scenarios
describe("ToolIntegrationService", () => {
  it("should handle recursive calls", () => {
    // Must mock complex provider interactions
    // Hard to control recursion depth
    // Difficult to test specific scenarios
  });
});

// After: Easy to test each level
describe("LocalAgent", () => {
  it("should handle 3 levels of tool recursion", () => {
    mockProvider.generateCompletion
      .mockResolvedValueOnce({ tool_calls: [toolCall1] })
      .mockResolvedValueOnce({ tool_calls: [toolCall2] })
      .mockResolvedValueOnce({ tool_calls: [toolCall3] })
      .mockResolvedValueOnce({ content: "Final response" });

    // Clear test of exact recursion behavior
  });
});
```

### 4. **Better Error Handling**

```typescript
// Agent-level error handling for each recursion step
while (currentResult.tool_calls && recursionDepth < maxRecursionDepth) {
  try {
    const toolResults = await this.toolExecutor.executeTools(/*...*/);
    // Handle success
  } catch (error) {
    // Handle tool execution error at specific recursion level
    console.error(`Tool execution failed at depth ${recursionDepth}:`, error);
    // Can decide whether to continue or abort
    break;
  }
  recursionDepth++;
}
```

### 5. **Enhanced Monitoring & Debugging**

```typescript
// Clear visibility into recursion flow
console.log(
  `[LocalAgent] Processing ${currentResult.tool_calls.length} tool calls (depth: ${recursionDepth})`
);

// Easy to add metrics
this.metrics.recordToolRecursion(recursionDepth, toolResults.length);

// Simple to add breakpoints for debugging
if (recursionDepth > 10) {
  debugger; // Investigate deep recursion
}
```

### 6. **Flexible Recursion Policies**

```typescript
// Agent can implement custom recursion policies
const maxRecursionDepth = this.agentSettings.maxToolRecursion || 50;
const timeoutMs = this.agentSettings.toolRecursionTimeout || 300000;

// Can implement different policies per agent type
if (this.agentSettings.conservativeMode) {
  maxRecursionDepth = 10; // Limit for conservative agents
}
```

### 7. **Better Callback Management**

```typescript
// Agent controls when callbacks are fired
while (currentResult.tool_calls && recursionDepth < maxRecursionDepth) {
  const toolResults = await this.toolExecutor.executeTools(
    currentResult,
    context,
    (toolMessage) => {
      // Agent decides when to emit tool messages
      context.options.onAdditionalMessage?.(toolMessage);
    }
  );

  // Agent can add additional context to callbacks
  context.options.onProgress?.(`Tool recursion depth: ${recursionDepth}`);
}
```

## Simplified Architecture

### Component Responsibilities

#### **LocalAgent** (Orchestrator)

- Manage conversation flow
- Handle recursion logic
- Control message history
- Coordinate callbacks
- Implement policies (timeouts, limits)

#### **ToolExecutor** (Executor)

- Execute tools only
- Return results
- Emit tool messages
- No recursion logic

#### **ToolIntegrationService** (Service)

- Process tool calls
- Execute individual tools
- Return standardized results
- No conversation management

## Migration Impact

### ✅ **Preserved Functionality**

- All existing tool execution works
- Same recursion depth limits
- Same error handling behavior
- Same callback system

### ✅ **Enhanced Capabilities**

- Better debugging and monitoring
- More flexible recursion policies
- Cleaner error boundaries
- Easier testing

### ✅ **Simplified Codebase**

- Clearer separation of concerns
- Reduced complexity in ToolIntegrationService
- More maintainable agent logic

## Conclusion

Moving recursive tool calls to the agent level provides:

1. **Better Architecture** - Clear separation of concerns
2. **Enhanced Control** - Agent orchestrates entire flow
3. **Improved Testing** - Each component easily testable
4. **Better Debugging** - Clear visibility into recursion
5. **Flexible Policies** - Easy to customize behavior

This change makes the system more maintainable while preserving all existing functionality and improving the developer experience.
