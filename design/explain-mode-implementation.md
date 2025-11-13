# Explain Mode Implementation Plan

## Overview
Implement an "Explain Mode" that toggles between interactive and view-only modes using **Ctrl+E**. In explain mode, tool calls show full content without truncation, and the chat input is hidden.

## Current Architecture Analysis

### 1. Tool Call Rendering (`packages/nuvin-cli/source/components/ToolCallViewer/`)
- **Main Component**: `ToolCallViewer/index.tsx`
  - Displays tool call name, parameters, timer, and results
  - Uses specialized parameter renderers based on tool type
  
- **Parameter Renderers** (`params/`):
  - `DefaultParamRender.tsx` - Shows all parameters (no filtering)
  - `FileEditParamRender.tsx` - **Filters out** `old_text` and `new_text` (verbose content)
  - `FileNewParamRender.tsx` - Shows file creation parameters
  - `AssignTaskParamRender.tsx` - Shows task delegation parameters
  - `TodoWriteParamRender.tsx` - (Already returns null, skips rendering)
  
- **Current Truncation Logic**:
  - `FileEditParamRender.tsx`: Explicitly filters `old_text`, `new_text`, `description`
  - Other renderers: Use `formatValue()` which JSON.stringifies objects with `JSON.stringify(value, null, 0)` (no pretty print)

### 2. Input Area (`packages/nuvin-cli/source/components/InputArea.tsx`)
- Text input with command menu support
- Command autocomplete (starts with `/`)
- VIM mode support
- Forwarded ref for external control (`InputAreaHandle`)

### 3. Interaction Layer (`packages/nuvin-cli/source/components/InteractionArea.tsx`)
- Wrapper that switches between:
  - Tool approval prompt
  - Active command UI
  - Input area (normal mode)
- Handles queued messages and ESC key behavior

### 4. Main App (`packages/nuvin-cli/source/app.tsx`)
- Manages global state (busy, vimMode, toolApprovalMode)
- Uses `useGlobalKeyboard` and `useKeyboardInput` hooks for keybindings
- Renders `ChatDisplay`, `InteractionArea`, and `Footer`

### 5. Keyboard Handling
- **`hooks/useKeyboardInput.ts`**: Listens for Ctrl+C and paste events, emits to EventBus
- **`hooks/useGlobalKeyboard.ts`**: Handles Ctrl+C exit flow and clipboard paste
- **EventBus** (`services/EventBus.ts`): Central event bus for global keyboard events

### 6. Theme & Context
- `contexts/ThemeContext.tsx` - Color theme management
- `contexts/ConfigContext.tsx` - App configuration
- `contexts/ToolApprovalContext.tsx` - Tool approval state
- No existing "ExplainModeContext" - needs to be created

## Implementation Plan

### Phase 1: Create Explain Mode Context & State Management

#### File: `packages/nuvin-cli/source/contexts/ExplainModeContext.tsx` (NEW)
```typescript
import { createContext, useContext, useState, type ReactNode } from 'react';

type ExplainModeContextType = {
  explainMode: boolean;
  toggleExplainMode: () => void;
  setExplainMode: (enabled: boolean) => void;
};

const ExplainModeContext = createContext<ExplainModeContextType | undefined>(undefined);

export const ExplainModeProvider = ({ children }: { children: ReactNode }) => {
  const [explainMode, setExplainModeState] = useState(false);

  const toggleExplainMode = () => {
    setExplainModeState((prev) => !prev);
  };

  const setExplainMode = (enabled: boolean) => {
    setExplainModeState(enabled);
  };

  return (
    <ExplainModeContext.Provider value={{ explainMode, toggleExplainMode, setExplainMode }}>
      {children}
    </ExplainModeContext.Provider>
  );
};

export const useExplainMode = () => {
  const context = useContext(ExplainModeContext);
  if (!context) {
    throw new Error('useExplainMode must be used within ExplainModeProvider');
  }
  return context;
};
```

**Purpose**: Global state to track explain mode status across components.

---

### Phase 2: Add Ctrl+E Keybinding

#### File: `packages/nuvin-cli/source/hooks/useKeyboardInput.ts` (MODIFY)
**Changes**:
- Add detection for Ctrl+E
- Emit event `ui:keyboard:explainToggle` via EventBus

```typescript
// Add after paste command check:
if (key.ctrl && _input === 'e') {
  eventBus.emit('ui:keyboard:explainToggle', undefined);
  return;
}
```

#### File: `packages/nuvin-cli/source/hooks/useGlobalKeyboard.ts` (MODIFY)
**Changes**:
- Add handler for `ui:keyboard:explainToggle` event
- Toggle explain mode and show notification

```typescript
const handleExplainToggle = useCallback(() => {
  const newMode = !explainModeEnabled; // Need to access from context
  setExplainMode(newMode);
  onNotification(newMode ? 'Explain Mode: ON (view only)' : 'Interactive Mode: ON', 1500);
}, [explainModeEnabled, onNotification]);

// In useEffect:
eventBus.on('ui:keyboard:explainToggle', handleExplainToggle);
// cleanup in return
```

**Note**: `useGlobalKeyboard` needs access to `ExplainModeContext`.

---

### Phase 3: Modify Tool Call Parameter Renderers

#### File: `packages/nuvin-cli/source/components/ToolCallViewer/params/types.ts` (MODIFY)
**Add `fullMode` to props**:
```typescript
export type ToolParamRendererProps = {
  toolCall: ToolCall;
  args: Record<string, unknown>;
  statusColor: string;
  formatValue: (value: unknown) => string;
  fullMode?: boolean; // NEW - when true, show full content without truncation
};
```

#### File: `packages/nuvin-cli/source/components/ToolCallViewer/params/FileEditParamRender.tsx` (MODIFY)
**Changes**:
- Accept `fullMode` prop (default: false)
- Still filter `old_text` and `new_text` in all modes
- When `fullMode === true`, use pretty-printed JSON for remaining parameters

```typescript
export const FileEditParamRender: React.FC<ToolParamRendererProps> = ({
  args,
  statusColor,
  formatValue,
  fullMode = false, // NEW
}: ToolParamRendererProps) => {
  // Always filter out old_text, new_text, and description
  const filteredArgs = Object.fromEntries(
    Object.entries(args).filter(([key]) => 
      key !== 'old_text' && key !== 'new_text' && key !== 'description'
    ),
  );

  // Override formatValue in full mode
  const format = (value: unknown): string => {
    if (!fullMode) return formatValue(value);
    
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2); // Pretty print
    }
    return String(value);
  };

  // ... rest of rendering using format() instead of formatValue()
};
```

#### File: `packages/nuvin-cli/source/components/ToolCallViewer/params/DefaultParamRender.tsx` (MODIFY)
**Changes**:
- Accept `fullMode` prop (default: false)
- When `fullMode === true`, use pretty-printed JSON (with indentation)
- Show full content without truncation

```typescript
export const DefaultParamRender: React.FC<ToolParamRendererProps> = ({
  args,
  statusColor,
  formatValue,
  fullMode = false, // NEW
}: ToolParamRendererProps) => {
  // Override formatValue in full mode
  const format = (value: unknown): string => {
    if (!fullMode) return formatValue(value);
    
    // In full mode, use pretty JSON
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2); // Pretty print
    }
    return String(value);
  };

  // ... rest same, but use format() instead of formatValue()
};
```

#### File: `packages/nuvin-cli/source/components/ToolCallViewer/params/FileNewParamRender.tsx` (MODIFY)
**Changes**:
- Accept `fullMode` prop (default: false)
- When `fullMode === true`, use pretty-printed JSON for parameters

```typescript
export const FileNewParamRender: React.FC<ToolParamRendererProps> = ({
  args,
  statusColor,
  formatValue,
  fullMode = false, // NEW
}: ToolParamRendererProps) => {
  const format = (value: unknown): string => {
    if (!fullMode) return formatValue(value);
    
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  // ... use format() instead of formatValue()
};
```

#### File: `packages/nuvin-cli/source/components/ToolCallViewer/params/AssignTaskParamRender.tsx` (MODIFY)
**Changes**:
- Accept `fullMode` prop (default: false)
- When `fullMode === true`, use pretty-printed JSON for parameters

```typescript
export const AssignTaskParamRender: React.FC<ToolParamRendererProps> = ({
  args,
  statusColor,
  formatValue,
  fullMode = false, // NEW
}: ToolParamRendererProps) => {
  const format = (value: unknown): string => {
    if (!fullMode) return formatValue(value);
    
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  // ... use format() instead of formatValue()
};
```

#### File: `packages/nuvin-cli/source/components/ToolCallViewer/index.tsx` (MODIFY)
**Changes**:
- Import `useExplainMode` hook
- Pass `fullMode` (set to true when explainMode is active) to parameter renderers

```typescript
import { useExplainMode } from '@/contexts/ExplainModeContext.js';

export const ToolCallViewer: React.FC<ToolCallProps> = ({ toolCall, toolResult, messageId }) => {
  const { theme } = useTheme();
  const { explainMode } = useExplainMode(); // NEW

  // ... existing code

  return (
    <Box flexDirection="column" marginTop={1}>
      {/* ... header ... */}

      {/* Tool Call Parameters */}
      {(() => {
        const ParamRenderer = getParameterRenderer();
        return (
          <ParamRenderer
            toolCall={toolCall}
            args={args}
            statusColor={statusColor}
            formatValue={formatValue}
            fullMode={explainMode} // NEW - enable full mode when in explain mode
          />
        );
      })()}

      {/* ... rest ... */}
    </Box>
  );
};
```

---

### Phase 4: Hide InteractionArea in App (UPDATED)

#### File: `packages/nuvin-cli/source/app.tsx` (MODIFY)
**Changes**:
- Import `useExplainMode`
- Conditionally render `InteractionArea` only when NOT in explain mode

```typescript
import { ExplainModeProvider, useExplainMode } from './contexts/ExplainModeContext.js';

// Create inner component to access context
function AppContent({ /* ... existing props ... */ }) {
  const { explainMode } = useExplainMode(); // Access context

  // ... all existing app logic

  return (
    <ErrorBoundary {...}>
      <Box flexDirection="column" height={'100%'} width="100%">
        <ChatDisplay key={`chat-display-${headerKey}`} messages={messages} headerKey={headerKey} />

        {/* Only render InteractionArea when NOT in explain mode */}
        {!explainMode && (
          <InteractionArea
            ref={inputAreaRef}
            busy={busy}
            vimModeEnabled={vimModeEnabled}
            hasActiveCommand={!!activeCommand}
            abortRef={abortRef}
            onNotification={setNotification}
            onBusyChange={setBusy}
            onInputSubmit={handleSubmit}
            onVimModeToggle={() => setVimModeEnabled((prev) => !prev)}
            onVimModeChanged={setVimMode}
          />
        )}

        <Footer
          status={status}
          lastMetadata={lastMetadata}
          accumulatedCost={accumulatedCost}
          toolApprovalMode={toolApprovalMode}
          vimModeEnabled={vimModeEnabled}
          vimMode={vimMode}
          workingDirectory={process.cwd()}
        />
      </Box>
    </ErrorBoundary>
  );
}

// Main App component wraps with provider
export default function App(props: Props) {
  if (showInitialSetup) {
    return <InitialConfigSetup ... />;
  }

  return (
    <ExplainModeProvider>
      <AppContent {...props} />
    </ExplainModeProvider>
  );
}
```

**Note**: No changes needed to `InteractionArea.tsx`

---

### Phase 5: Add Visual Indicator in Footer

#### File: `packages/nuvin-cli/source/components/Footer.tsx` (MODIFY)
**Changes**:
- Import `useExplainMode`
- Display "EXPLAIN MODE" indicator next to other status indicators (sudo, vim)

```typescript
import { useExplainMode } from '@/contexts/ExplainModeContext.js';

export const Footer = ({ /* ... props ... */ }) => {
  const { explainMode } = useExplainMode(); // NEW

  // ... existing code

  return (
    <Box flexDirection="row" justifyContent="space-between">
      {/* Left side */}
      <Box flexDirection="row" gap={1}>
        {/* ... existing status indicators ... */}
        {explainMode && (
          <Text color="yellow" bold>
            [EXPLAIN]
          </Text>
        )}
      </Box>
      {/* Right side - costs, vim, etc. */}
    </Box>
  );
};
```

---

### Phase 6: Update useGlobalKeyboard Hook

#### File: `packages/nuvin-cli/source/hooks/useGlobalKeyboard.ts` (MODIFY)
**Update to access ExplainMode context**:
```typescript
import { useExplainMode } from '@/contexts/ExplainModeContext.js';

export const useGlobalKeyboard = ({ /* ... existing props ... */ }): void => {
  const { explainMode, toggleExplainMode } = useExplainMode(); // NEW

  const handleExplainToggle = useCallback(() => {
    toggleExplainMode();
    onNotification(
      !explainMode ? 'Explain Mode: ON (view only)' : 'Interactive Mode: ON',
      1500
    );
  }, [explainMode, toggleExplainMode, onNotification]);

  // ... rest of handlers

  useEffect(() => {
    // ... existing events
    eventBus.on('ui:keyboard:explainToggle', handleExplainToggle);

    return () => {
      // ... existing cleanup
      eventBus.off('ui:keyboard:explainToggle', handleExplainToggle);
    };
  }, [/* ... dependencies ..., handleExplainToggle */]);
};
```

**Note**: App.tsx provider wrapping is already covered in Phase 4

---

### Phase 7: Summary of Parameter Renderer Updates

All parameter renderers have been updated to accept `fullMode` prop:

#### Updated Files:
- ✅ `types.ts` - Added `fullMode?: boolean` to `ToolParamRendererProps`
- ✅ `DefaultParamRender.tsx` - Pretty-print JSON when `fullMode === true`
- ✅ `FileEditParamRender.tsx` - Pretty-print JSON when `fullMode === true` (still filters old_text/new_text)
- ✅ `FileNewParamRender.tsx` - Pretty-print JSON when `fullMode === true`
- ✅ `AssignTaskParamRender.tsx` - Pretty-print JSON when `fullMode === true`

**Behavior**: When `fullMode` is enabled (via explain mode), all renderers use pretty-printed JSON with 2-space indentation instead of compact JSON.

---

## Summary of Changes

### New Files:
1. `contexts/ExplainModeContext.tsx` - Context for explain mode state

### Modified Files:
1. `hooks/useKeyboardInput.ts` - Add Ctrl+E detection
2. `hooks/useGlobalKeyboard.ts` - Handle explain toggle event
3. `components/ToolCallViewer/index.tsx` - Pass fullMode to renderers
4. `components/ToolCallViewer/params/types.ts` - Add fullMode to props type
5. `components/ToolCallViewer/params/FileEditParamRender.tsx` - Pretty print in full mode (still filters old_text/new_text)
6. `components/ToolCallViewer/params/DefaultParamRender.tsx` - Pretty print in full mode
7. `components/ToolCallViewer/params/FileNewParamRender.tsx` - Pretty print in full mode
8. `components/ToolCallViewer/params/AssignTaskParamRender.tsx` - Pretty print in full mode
9. `components/Footer.tsx` - Show explain mode indicator
10. `app.tsx` - Wrap with ExplainModeProvider and conditionally hide InteractionArea

---

## Testing Plan

### Manual Tests:
1. **Toggle Explain Mode**: Press Ctrl+E, verify notification appears
2. **Input Hidden**: In explain mode, verify chat input is hidden
3. **Tool Calls - Full Content**:
   - Execute `file_edit` tool call
   - In normal mode: verify `old_text`/`new_text` are hidden
   - Toggle Ctrl+E to explain mode: verify full content is shown
4. **Toggle Back**: Press Ctrl+E again, verify input reappears
5. **Footer Indicator**: Verify [EXPLAIN] appears in footer when enabled
6. **Other Modes**: Test with tool approval and active commands, ensure no conflicts

### Edge Cases:
- Toggle during busy state (should work)
- Toggle during tool approval (should work but approval UI takes precedence)
- Toggle with active command (should work but command UI takes precedence)
- Multiple rapid toggles (should handle gracefully)

---

## Implementation Order

1. ✅ Create `ExplainModeContext.tsx`
2. ✅ Update `useKeyboardInput.ts` to detect Ctrl+E
3. ✅ Update `hooks/useGlobalKeyboard.ts` to handle toggle
4. ✅ Update parameter renderer types (`fullMode` prop)
5. ✅ Update all parameter renderers (DefaultParamRender, FileEditParamRender, FileNewParamRender, AssignTaskParamRender)
6. ✅ Update `ToolCallViewer/index.tsx` to pass fullMode
7. ✅ Update `Footer.tsx` to show indicator
8. ✅ Update `app.tsx` to wrap with provider and conditionally hide InteractionArea
9. ✅ Test all scenarios

---

## Notes

- **No truncation in explain mode**: All content shown, may cause scrolling
- **View-only mode**: User can scroll through history but cannot send messages
- **Keyboard shortcut**: Ctrl+E is easy to remember (E for Explain)
- **Notification feedback**: User gets visual confirmation when toggling
- **Non-intrusive**: When not in explain mode, behavior is identical to current
- **Extensible**: Can add more explain-mode-specific features later (e.g., copy full content, export tool calls)
