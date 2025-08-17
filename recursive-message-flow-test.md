# Recursive Tool Call Message Flow Test

## Problem Identified

The original implementation had an issue where each recursive iteration was building on the original `context.params.messages` instead of accumulating messages properly through the conversation.

## Before (Incorrect)

```typescript
// Each iteration starts from the same base messages
const followUpParams = {
  ...context.params,
  messages: [
    ...context.params.messages, // ❌ Always same base
    {
      role: "assistant",
      content: currentResult.content,
      tool_calls: currentResult.tool_calls,
    },
    ...toolMessages,
  ],
};
```

### Message Flow Issue:

```
Initial: [user_message]
Round 1: [user_message, assistant_with_tools_1, tool_results_1]
Round 2: [user_message, assistant_with_tools_2, tool_results_2]  // ❌ Missing Round 1!
Round 3: [user_message, assistant_with_tools_3, tool_results_3]  // ❌ Missing Rounds 1&2!
```

## After (Correct)

```typescript
let currentMessages = [...context.params.messages]; // Track properly

while (currentResult.tool_calls && recursionDepth < maxRecursionDepth) {
  // ... execute tools ...

  // Add assistant message with tool calls
  currentMessages.push({
    role: "assistant",
    content: currentResult.content,
    tool_calls: currentResult.tool_calls,
  });

  // Add tool result messages
  currentMessages.push(...toolMessages);

  // Use accumulated messages for next round
  const followUpParams = {
    ...context.params,
    messages: currentMessages, // ✅ Properly accumulated
  };
}
```

### Correct Message Flow:

```
Initial: [user_message]
Round 1: [user_message, assistant_with_tools_1, tool_results_1]
Round 2: [user_message, assistant_with_tools_1, tool_results_1, assistant_with_tools_2, tool_results_2]
Round 3: [user_message, assistant_with_tools_1, tool_results_1, assistant_with_tools_2, tool_results_2, assistant_with_tools_3, tool_results_3]
```

## Example Scenario: File Creation Chain

### User Request:

"Create a config file, validate it, then generate a report"

### Correct Message Flow:

#### **Round 1:**

```json
Messages: [
  {"role": "user", "content": "Create a config file, validate it, then generate a report"}
]
↓
LLM Response: {"content": "", "tool_calls": [{"function": {"name": "createFile"}}]}
↓
Tool Execution: Creates config.json
↓
Messages: [
  {"role": "user", "content": "Create a config file, validate it, then generate a report"},
  {"role": "assistant", "content": "", "tool_calls": [{"function": {"name": "createFile"}}]},
  {"role": "tool", "content": "File created successfully", "tool_call_id": "call_1"}
]
```

#### **Round 2:**

```json
Messages: [
  {"role": "user", "content": "Create a config file, validate it, then generate a report"},
  {"role": "assistant", "content": "", "tool_calls": [{"function": {"name": "createFile"}}]},
  {"role": "tool", "content": "File created successfully", "tool_call_id": "call_1"}
]
↓
LLM Response: {"content": "", "tool_calls": [{"function": {"name": "validateFile"}}]}
↓
Tool Execution: Validates config.json
↓
Messages: [
  {"role": "user", "content": "Create a config file, validate it, then generate a report"},
  {"role": "assistant", "content": "", "tool_calls": [{"function": {"name": "createFile"}}]},
  {"role": "tool", "content": "File created successfully", "tool_call_id": "call_1"},
  {"role": "assistant", "content": "", "tool_calls": [{"function": {"name": "validateFile"}}]},
  {"role": "tool", "content": "Validation passed", "tool_call_id": "call_2"}
]
```

#### **Round 3:**

```json
Messages: [
  {"role": "user", "content": "Create a config file, validate it, then generate a report"},
  {"role": "assistant", "content": "", "tool_calls": [{"function": {"name": "createFile"}}]},
  {"role": "tool", "content": "File created successfully", "tool_call_id": "call_1"},
  {"role": "assistant", "content": "", "tool_calls": [{"function": {"name": "validateFile"}}]},
  {"role": "tool", "content": "Validation passed", "tool_call_id": "call_2"}
]
↓
LLM Response: {"content": "", "tool_calls": [{"function": {"name": "generateReport"}}]}
↓
Tool Execution: Generates report
↓
Messages: [
  {"role": "user", "content": "Create a config file, validate it, then generate a report"},
  {"role": "assistant", "content": "", "tool_calls": [{"function": {"name": "createFile"}}]},
  {"role": "tool", "content": "File created successfully", "tool_call_id": "call_1"},
  {"role": "assistant", "content": "", "tool_calls": [{"function": {"name": "validateFile"}}]},
  {"role": "tool", "content": "Validation passed", "tool_call_id": "call_2"},
  {"role": "assistant", "content": "", "tool_calls": [{"function": {"name": "generateReport"}}]},
  {"role": "tool", "content": "Report generated", "tool_call_id": "call_3"}
]
```

#### **Final Round:**

```json
Messages: [
  {"role": "user", "content": "Create a config file, validate it, then generate a report"},
  {"role": "assistant", "content": "", "tool_calls": [{"function": {"name": "createFile"}}]},
  {"role": "tool", "content": "File created successfully", "tool_call_id": "call_1"},
  {"role": "assistant", "content": "", "tool_calls": [{"function": {"name": "validateFile"}}]},
  {"role": "tool", "content": "Validation passed", "tool_call_id": "call_2"},
  {"role": "assistant", "content": "", "tool_calls": [{"function": {"name": "generateReport"}}]},
  {"role": "tool", "content": "Report generated", "tool_call_id": "call_3"}
]
↓
LLM Response: {"content": "I've successfully created the config file, validated it, and generated a report. All tasks are complete!"}
```

## Benefits of the Fix

### 1. **Proper Context Preservation**

- LLM sees the complete conversation history
- Can reference previous tool results
- Makes informed decisions about next steps

### 2. **Better Tool Chaining**

- Each tool can build on previous results
- LLM understands the full workflow
- More intelligent tool selection

### 3. **Improved Error Handling**

- LLM can see if previous tools failed
- Can retry or take alternative approaches
- Better recovery from partial failures

### 4. **Enhanced User Experience**

- More coherent multi-step workflows
- Better progress tracking
- More intelligent responses

## Testing the Fix

### Test Case: Multi-Step File Operations

```typescript
describe("Recursive Tool Call Message Flow", () => {
  it("should accumulate messages properly across recursive calls", async () => {
    const mockProvider = {
      generateCompletion: jest
        .fn()
        .mockResolvedValueOnce({
          content: "",
          tool_calls: [
            { id: "1", function: { name: "createFile", arguments: "{}" } },
          ],
        })
        .mockResolvedValueOnce({
          content: "",
          tool_calls: [
            { id: "2", function: { name: "readFile", arguments: "{}" } },
          ],
        })
        .mockResolvedValueOnce({
          content: "File operations completed successfully",
          tool_calls: [],
        }),
    };

    const result = await localAgent.sendMessage(["Create and read a file"]);

    // Verify that each generateCompletion call received accumulated messages
    expect(mockProvider.generateCompletion).toHaveBeenCalledTimes(3);

    // First call: just user message
    expect(
      mockProvider.generateCompletion.mock.calls[0][0].messages
    ).toHaveLength(1);

    // Second call: user + assistant + tool result
    expect(
      mockProvider.generateCompletion.mock.calls[1][0].messages
    ).toHaveLength(3);

    // Third call: user + assistant + tool + assistant + tool
    expect(
      mockProvider.generateCompletion.mock.calls[2][0].messages
    ).toHaveLength(5);
  });
});
```

## Conclusion

The fix ensures that:
✅ **Message history is properly accumulated** across recursive tool calls
✅ **LLM has full context** for making intelligent decisions
✅ **Tool chaining works correctly** with complete conversation history
✅ **Error recovery is improved** with visibility into previous steps
✅ **User experience is enhanced** with more coherent workflows

This resolves the critical issue where the LLM was losing context between recursive tool calls, leading to suboptimal tool selection and workflow execution.
