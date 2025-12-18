# Tool Approval Edit Instruction Feature

## Overview
Add an edit input to the ToolApprovalPrompt that allows users to provide feedback/instructions instead of approving or denying a tool call.

**Key concept:** The tool call is skipped (not executed), but the user's instruction replaces the tool result. The LLM sees this as if the tool returned the user's feedback, allowing it to regenerate with adjusted tool calls.

## UI Design

**Default state (action buttons focused):**
```
┌─ bash_tool ──────────────────────────────────────── 1/3 ─┐
│                                                          │
│  cmd: rm -rf /tmp/cache                                  │
│  cwd: /Users/marsch/Projects/nuvin-space-public          │
│                                                          │
│  ❯ Yes    No    Yes, for this session                    │
│                                                          │
│  │ Input your changes here                               │
│                                                          │
│  1/2/3 Quick Select • 4 Edit • Tab/←→ Navigate           │
└──────────────────────────────────────────────────────────┘
```

**When user presses `4` (input focused):**
```
┌─ bash_tool ──────────────────────────────────────── 1/3 ─┐
│                                                          │
│  cmd: rm -rf /tmp/cache                                  │
│  cwd: /Users/marsch/Projects/nuvin-space-public          │
│                                                          │
│    Yes    No    Yes, for this session                    │
│                                                          │
│  ❯ change to only delete .log files█                     │
│                                                          │
│  Enter Submit • Esc Cancel                               │
└──────────────────────────────────────────────────────────┘
```

## Behavior
- Input always visible below action buttons with placeholder text
- Press `4` → focus input, action buttons lose focus indicator (`❯` moves to input)
- Type instruction → press `Enter` → submit (empty input ignored)
- `Esc` → cancel edit mode, return to action buttons
- `1/2/3` shortcuts work when not in edit mode
- State resets when component remounts (after LLM regenerates)

## Complete Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERACTION                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. ToolApprovalPrompt.tsx                                                   │
│    - User presses `4` → setIsEditMode(true)                                 │
│    - User types instruction in input                                        │
│    - User presses Enter                                                     │
│    - handleEditSubmit() calls onApproval('edit', undefined, instruction)    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. ToolApprovalContext.tsx                                                  │
│    - handleApprovalResponse('edit', undefined, editInstruction)             │
│    - Calls orchestrator.handleToolApproval(                                 │
│        approvalId, 'edit', undefined, editInstruction                       │
│      )                                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. orchestrator.ts - handleToolApproval()                                   │
│    - decision === 'edit' && editInstruction                                 │
│    - approval.resolve({ editInstruction })  // NOT ToolCall[]               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. orchestrator.ts - waitForToolApproval() returns                          │
│    - Returns: { editInstruction: "only delete .log files" }                 │
│    - Type: ToolApprovalResult = ToolCall[] | { editInstruction: string }    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 5. orchestrator.ts - processToolApproval()                                  │
│    - Check: if ('editInstruction' in result)                                │
│    - SKIP tool execution (tool never runs)                                  │
│    - Add to accumulatedMessages:                                            │
│      {                                                                      │
│        role: 'assistant',                                                   │
│        content: assistantContent,                                           │
│        tool_calls: originalToolCalls                                        │
│      }                                                                      │
│    - Add FAKE tool result for each tool call:                               │
│      {                                                                      │
│        role: 'tool',                                                        │
│        tool_call_id: toolCall.id,                                           │
│        content: editInstruction  // User's instruction as result            │
│      }                                                                      │
│    - Return { approvedCalls: [], wasDenied: false, editInstruction }        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 6. orchestrator.ts - send() loop                                            │
│    - Check: if (editInstruction && approvedCalls.length === 0)              │
│    - continue; // Don't break, continue the loop                            │
│    - Loop sends accumulatedMessages to LLM                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 7. LLM receives messages including fake tool result                         │
│                                                                             │
│    Messages sent to LLM:                                                    │
│    [                                                                        │
│      { role: 'user', content: 'delete tmp cache' },                         │
│      { role: 'assistant', tool_calls: [{ name: 'bash_tool', ... }] },       │
│      { role: 'tool', content: 'only delete .log files' }  // User feedback  │
│    ]                                                                        │
│                                                                             │
│    LLM sees user's instruction as tool output and regenerates:              │
│    { name: 'bash_tool', arguments: { cmd: 'rm -rf /tmp/cache/*.log' } }     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 8. Tool approval prompt shows again with new tool call                      │
│    - User can approve, deny, or edit again                                  │
│    - Cycle continues until user approves or denies                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Example

**Original tool call:**
```json
{
  "name": "bash_tool",
  "arguments": { "cmd": "rm -rf /tmp/cache" }
}
```

**User instruction:** "only delete .log files"

**What LLM sees as tool result:**
```
[USER FEEDBACK - Tool was not executed]: only delete .log files
```

**LLM regenerates with:**
```json
{
  "name": "bash_tool",
  "arguments": { "cmd": "rm -rf /tmp/cache/*.log" }
}
```

## Changes Required

### nuvin-core

#### 1. `src/ports.ts`
- Add `'edit'` to `ToolApprovalDecision` type:
  ```typescript
  export type ToolApprovalDecision = 'approve' | 'deny' | 'approve_all' | 'edit';
  ```
- Add new `ToolApprovalResponse` event variant for edit:
  ```typescript
  | {
      type: typeof AgentEventTypes.ToolApprovalResponse;
      conversationId: string;
      messageId: string;
      approvalId: string;
      decision: 'edit';
      editInstruction: string;
    }
  ```

#### 2. `src/orchestrator.ts`
- Define `ToolApprovalResult` type:
  ```typescript
  type ToolApprovalResult = ToolCall[] | { editInstruction: string };
  ```
- Update `pendingApprovals` Map to resolve with `ToolApprovalResult`:
  ```typescript
  private pendingApprovals = new Map<
    string,
    { resolve: (result: ToolApprovalResult) => void; reject: (error: Error) => void }
  >();
  ```
- Update `waitForToolApproval()` return type to `Promise<ToolApprovalResult>`
- Update `handleToolApproval()` signature:
  ```typescript
  public handleToolApproval(
    approvalId: string,
    decision: ToolApprovalDecision,
    approvedCalls?: ToolCall[],
    editInstruction?: string
  ): void
  ```
  - When `decision === 'edit'`, resolve with `{ editInstruction }`
- Update `processToolApproval()`:
  - Check result type after `waitForToolApproval`
  - If `editInstruction`, add assistant + fake tool results to accumulatedMessages
  - Prefix instruction: `[USER FEEDBACK - Tool was not executed]: ${editInstruction}`
  - Return `{ approvedCalls: [], wasDenied: false, editInstruction }`
- Update `send()` loop:
  - When `editInstruction` present and no approved calls, `continue`

### nuvin-cli

#### 1. `source/components/ToolApprovalPrompt/ToolEditInput.tsx` (new file)
- Use `ink`'s `TextInput` component for the input field
- Input component without border (just `│` prefix)
- Shows `❯` indicator when focused (same style as action buttons)
- Placeholder: "Input your changes here"
- Handles `Esc` to cancel
- When focused: use dim background color for the input area to indicate edit mode

#### 2. `source/components/ToolApprovalPrompt/ToolApprovalPrompt.tsx`
- Add `isEditMode` and `editValue` state
- Add `handleEditSubmit` and `handleEditCancel` handlers
- Press `4` → `setIsEditMode(true)`
- Pass `isEditMode ? -1 : selectedAction` to `ToolActions` (hide focus when editing)
- Update `onApproval` type to include `editInstruction`:
  ```typescript
  onApproval: (decision: ToolApprovalDecision, approvedCalls?: ToolCall[], editInstruction?: string) => void;
  ```
- Update footer text based on mode
- Validate non-empty input before submitting (ignore empty submissions)

#### 3. `source/contexts/ToolApprovalContext.tsx`
- Update `handleApprovalResponse` signature:
  ```typescript
  handleApprovalResponse: (decision: ToolApprovalDecision, approvedCalls?: ToolCall[], editInstruction?: string) => void;
  ```
- Pass `editInstruction` to `orchestrator.handleToolApproval()`

## Key Points
- **Tool execution is SKIPPED** - the actual tool never runs
- **User's instruction REPLACES the tool result** - LLM sees instruction as tool output
- **Loop continues** (not breaks) so LLM can immediately regenerate
- **No memory save** during edit - this is intermediate state
- **No AssistantMessage event** - no UI message shown for the edit
- User can keep editing until satisfied, then approve the final tool call
- **Clear feedback prefix** - instruction prefixed with `[USER FEEDBACK - Tool was not executed]:` to clearly distinguish from actual tool output

## Implementation Notes

### Component State Reset
When user submits an edit instruction and LLM regenerates with new tool calls, the `ToolApprovalPrompt` component will unmount and remount. All local state (`isEditMode`, `editValue`, `selectedAction`) naturally resets on remount.

### Empty Input Handling
- If user presses Enter with empty input, ignore the submission
- Keep focus in edit mode, allow user to type or press Esc to cancel

### Keyboard Handling in Edit Mode
- When `isEditMode === true`, disable `1/2/3` shortcuts and Tab navigation
- Only `Enter` (submit) and `Esc` (cancel) are active
- All other keys go to TextInput

### Dependencies
- Use `ink`'s built-in `TextInput` component (already available in the project)
