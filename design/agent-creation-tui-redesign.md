# Agent Creation Flow - TUI Redesign Plan

## Overview

Redesign the agent creation flow to be more TUI-friendly, with clear visual states, inline editing, and better user guidance.

## Current Issues

| Category | Issue | Impact |
|----------|-------|--------|
| UX | Preview doesn't show systemPrompt | Can't verify LLM output |
| UX | Y/N selection before editing | Extra unnecessary step |
| UX | Loading state has no progress | Feels stuck |
| UX | Technical error messages | Confusing for users |
| State | Complex state management | Hard to maintain |
| Missing | No inline preview editing | Wasted clicks |
| Missing | No tool descriptions | Don't know capabilities |
| Missing | No retry mechanism | Bad generation = start over |

## New Flow

```
Description Input → Loading → Preview (inline edit) → Edit Fields → Confirm → Success
```

## Step-by-Step Design

### Step 1: Description Input

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Create New Agent                                                             │
│  ─────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│  Describe what you want this agent to do.                                    │
│  Include: role, expertise, tools, and any special behaviors.                │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Description:                                                         │ │
│  │ > A security specialist that audits code for vulnerabilities and     │ │
│  │   provides actionable remediation steps for OWASP Top 10 issues.     │ │
│  │                                                                    │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Examples:                                                                   │
│    • "Code reviewer focused on Go performance and concurrency patterns"     │
│    • "API documentation writer that generates OpenAPI specs from code"      │
│    • "Database schema migrator with rollback support"                       │
│                                                                              │
│  [↓ Select]  [Enter Generate]  [ESC Cancel]                                  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Step 2: Loading State

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Creating Agent...                                                            │
│  ─────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│  ╔══════════════════════════════════════════════════════════════════════╗   │
│  ║  Generating system prompt...                                     60%  ║   │
│  ╚══════════════════════════════════════════════════════════════════════╝   │
│                                                                              │
│  └─ Determining appropriate tools                                          │
│  └─ Setting temperature to 0.3 for consistency                              │
│  └─ Defining agent boundaries                                               │
│                                                                              │
│  This may take 10-30 seconds depending on model latency.                    │
│                                                                              │
│  [ESC Cancel]                                                                 │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Step 3: Preview State (Key Changes)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Preview: Security Auditor                                                    │
│  ─────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│  ┌─ Agent Configuration ─────────────────────────────────────────────────┐  │
│  │ ID:           security-auditor                                         │  │
│  │ Name:         Security Auditor                                         │  │
│  │ Description:  Use this agent when you need to audit code for           │  │
│  │               vulnerabilities. Examples:                               │  │
│  │               • Web app security review                                │  │
│  │               • Dependency CVE checking                                │  │
│  │ Tools:        file_read, web_search, bash_tool, grep_tool              │  │
│  │ Temperature:  0.3                                                      │  │
│  │ Model:        (inherits from parent)                                   │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌─ System Prompt (Editable) ─────────────────────────────────────────────┐  │
│  │ You are a security auditing specialist. Your role is to:               │  │
│  │                                                                         │  │
│  │ 1. Analyze code for vulnerabilities (SQLi, XSS, CSRF, auth)           │  │
│  │ 2. Check dependencies for known CVEs                                   │  │
│  │ 3. Review authentication and authorization logic                       │  │
│  │ 4. Provide specific, actionable remediation steps                      │  │
│  │                                                                         │  │
│  │ Always prioritize critical issues. Report findings with:               │  │
│  │ - Vulnerability name and severity                                       │  │
│  │ - Location (file:line)                                                 │  │
│  │ - Description and impact                                               │  │
│  │ - Proof of concept                                                     │  │
│  │ - Recommended fix                                                     │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌─ Actions ──────────────────────────────────────────────────────────────┐  │
│  │                                                                            │
│  │  [Enter] Edit fields     [Ctrl+E] Edit system prompt     [Y] Save       │
│  │  [Tab] Focus navigation  [ESC] Cancel                                    │
│  │                                                                            │
│  └────────────────────────────────────────────────────────────────────────────┘
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Step 4a: Edit Fields

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Edit Agent: Security Auditor                                                 │
│  ─────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│  ┌─ Core Configuration ───────────────────────────────────────────────────┐  │
│  │                                                                            │
│  │  Name         [Security Auditor_______________________] ●               │  │
│  │  ID           [security-auditor______________________] ○               │  │
│  │  Model        [__________________________] (leave empty to inherit)    │  │
│  │  Temperature  [0.3] (0-2, lower = more deterministic)                  │  │
│  │                                                                            │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌─ Tools ────────────────────────────────────────────────────────────────┐  │
│  │                                                                            │
│  │  Available:                                                              │
│  │    [✓] file_read    [✓] web_search    [✓] bash_tool    [✓] grep_tool   │  │
│  │    [ ] file_new     [ ] file_edit      [ ] assign_tool    [ ] glob_tool │  │
│  │    [ ] ls_tool      [ ] todo_write     [ ] web_fetch      [ ] ...       │  │
│  │                                                                            │
│  │  Selected: 6 tools (↑↓ navigate, Space toggle, Enter confirm)          │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌─ Description ──────────────────────────────────────────────────────────┐  │
│  │  [Use this agent when you need to audit code for vulnerabilities...]   │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  [Enter] Next field    [Ctrl+S] Save    [Tab] Skip field    [ESC] Cancel    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Step 4b: Edit System Prompt

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Edit System Prompt: Security Auditor                                         │
│  ─────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│  ┌─ Current Prompt ───────────────────────────────────────────────────────┐  │
│  │                                                                            │
│  │  You are a security auditing specialist. Your role is to analyze         │  │
│  │  code for security vulnerabilities, including:                          │  │
│  │                                                                            │  │
│  │  • SQL injection, XSS, CSRF, and authentication issues                  │  │
│  │  • Insecure dependencies and known CVEs                                 │  │
│  │  • Authorization and access control flaws                               │  │
│  │                                                                            │  │
│  │  For each finding, provide:                                             │  │
│  │  1. Vulnerability name and severity (Critical/High/Medium/Low)          │  │
│  │  2. Exact location (file path and line number)                          │  │
│  │  3. Description of the issue and potential impact                       │  │
│  │  4. Proof of concept or example of exploit                              │  │
│  │  5. Recommended remediation with code example                           │  │
│  │                                                                            │  │
│  │  Always report findings in a structured format. Critical issues         │  │
│  │  should be flagged with [CRITICAL] prefix.                              │  │
│  │                                                                            │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌─ Edit Area ────────────────────────────────────────────────────────────┐  │
│  │                                                                            │
│  │  > _                                                                    │
│  │                                                                            │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  [Enter] Insert line    [Ctrl+S] Save & exit    [ESC] Cancel without save   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Step 5: Success Confirmation

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ✓ Agent Created Successfully                                                │
│  ─────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│  ┌─ Security Auditor ─────────────────────────────────────────────────────┐  │
│  │                                                                            │
│  │  ID:           security-auditor                                         │  │
│  │  Tools:        file_read, web_search, bash_tool, grep_tool              │  │
│  │  Temperature:  0.3                                                      │  │
│  │  Status:       ✓ Enabled                                                │  │
│  │                                                                            │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  This agent is now available in the agent registry.                         │
│  You can invoke it using: assign_tool(agent: "security-auditor", ...)       │
│                                                                              │
│  ┌─ Next Steps ───────────────────────────────────────────────────────────┐  │
│  │                                                                            │
│  │  [Enter] Create another agent                                            │  │
│  │  [ESC]  Return to agent configuration                                   │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Error State

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ✗ Generation Failed                                                         │
│  ─────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│  ┌─ Error ────────────────────────────────────────────────────────────────┐  │
│  │                                                                            │
│  │  The LLM failed to generate a valid agent configuration.                │  │
│  │                                                                            │  │
│  │  Possible causes:                                                         │  │
│  │  • Description too vague or ambiguous                                    │  │
│  │  • Model timeout or rate limiting                                       │  │
│  │  • Network connectivity issues                                           │  │
│  │                                                                            │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌─ Suggestions ──────────────────────────────────────────────────────────┐  │
│  │                                                                            │
│  │  Try being more specific about:                                          │  │
│  │  • The agent's domain expertise (e.g., "Go concurrency", "REST APIs")  │  │
│  │  • Specific tools it should use                                          │  │
│  │  • Output format or constraints                                          │  │
│  │                                                                            │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  [Enter] Try again    [ESC] Cancel                                          │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Keyboard Navigation

| Key | Action |
|-----|--------|
| `Enter` | Next field / Confirm selection |
| `Tab` | Skip to next section |
| `Space` | Toggle tool selection |
| `↑/↓` | Navigate list items |
| `Ctrl+E` | Edit system prompt |
| `Ctrl+S` | Save and continue |
| `Y` | Quick save from preview |
| `N` | Edit from preview |
| `ESC` | Cancel / Go back |

## Implementation Tasks

### Phase 1: Core Components

1. **Update AgentPreview.tsx**
   - Add systemPrompt display
   - Add inline edit actions
   - Show tool list with count

2. **Update AgentForm.tsx**
   - Improve tool selection with descriptions
   - Add model field (currently missing)
   - Better validation feedback

3. **Update AgentCreator.ts**
   - Add retry mechanism (2-3 attempts on parse failure)
   - Lower temperature to 0.3-0.5
   - Better error messages

### Phase 2: UI Improvements

4. **Update AgentLoading.tsx**
   - Add progress indicator
   - Show step-by-step status

5. **Update AgentError.tsx**
   - Add suggestions for common issues
   - Add retry button

6. **Update AgentDescriptionInput.tsx**
   - Add example dropdown
   - Add character count
   - Better placeholder text

### Phase 3: New Components

7. **Create SystemPromptEditor.tsx**
   - Multi-line text editing
   - Syntax highlighting for prompt
   - Ctrl+S to save

8. **Create AgentSuccess.tsx**
   - Summary card
   - Next steps actions

9. **Create ToolSelectImproved.tsx**
   - Tool descriptions on hover
   - Categories for tools
   - Search/filter capability

### Phase 4: Integration

10. **Update useAgentCreationState.ts**
    - Simplify state machine
    - Add error recovery paths
    - Better transitions

11. **Update useAgentCreationKeyboard.ts**
    - Support new keyboard shortcuts
    - Consistent navigation

12. **Update AgentCreator system prompt**
    - Remove contradictions
    - Add missing fields (model, provider, timeout)
    - Reduce temperature

## Files to Modify

```
packages/nuvin-cli/source/
├── components/AgentCreation/
│   ├── AgentCreation.tsx          # Main orchestrator
│   ├── AgentDescriptionInput.tsx  # Step 1
│   ├── AgentPreview.tsx           # Step 3 (redesign)
│   ├── AgentForm.tsx              # Step 4a (improve)
│   ├── AgentLoading.tsx           # Step 2 (add progress)
│   ├── AgentError.tsx             # Error state (improve)
│   ├── AgentSuccess.tsx           # NEW - Step 5
│   ├── SystemPromptEditor.tsx     # NEW - Ctrl+E editor
│   ├── ToolSelectImproved.tsx     # NEW - better tools
│   ├── useAgentCreationState.ts   # State management
│   └── useAgentCreationKeyboard.ts # Keyboard handling
└── services/
    └── AgentCreator.ts            # Add retry, better errors
```

## Backward Compatibility

- `AgentCreationProps` interface should remain compatible
- `mode='create'|'edit'` behavior preserved
- Callbacks (`onGenerate`, `onCancel`, `onConfirm`) unchanged

## Testing Checklist

- [ ] Description input with examples
- [ ] Loading state with progress
- [ ] Preview shows systemPrompt
- [ ] Enter key enters edit mode
- [ ] Ctrl+E opens system prompt editor
- [ ] Tool selection with descriptions
- [ ] Error state with suggestions
- [ ] Success state with next steps
- [ ] Keyboard navigation works
- [ ] ESC cancels at each step
- [ ] Retry on generation failure
