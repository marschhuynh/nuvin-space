# FocusContext Design Plan

## Overview

Centralized focus management for the CLI app to control keyboard input across all components.

## Current State

- Focus managed locally via `focusArea` state in `app-virtualized.tsx` (`'input' | 'chat'`)
- Components use `useInput({ isActive: condition })` to conditionally listen to keyboard input
- Modal components (ToolApprovalPrompt, MCPModal, OAuthUI) override focus implicitly
- No unified way to manage focus priority or nested focus scenarios

## Proposed Architecture

### Types

```typescript
type FocusLayer =
  | 'input'          // Main input area
  | 'chat'           // Scrollable chat area
  | 'modal'          // Any modal overlay
  | 'tool-approval'  // Tool approval prompt
  | 'command'        // Active command UI
  | 'menu'           // Command menu / ComboBox
  | 'auth';          // Auth flow UI

type FocusContextValue = {
  // Current focus state
  activeLayer: FocusLayer;
  focusStack: FocusLayer[];

  // Focus control
  pushFocus: (layer: FocusLayer) => void;
  popFocus: () => void;
  setFocus: (layer: FocusLayer) => void;

  // Focus query helpers
  hasFocus: (layer: FocusLayer) => boolean;
  isInputActive: () => boolean;
};
```

### Context Implementation

```typescript
// packages/nuvin-cli/source/contexts/FocusContext.tsx

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type FocusLayer =
  | 'input'
  | 'chat'
  | 'modal'
  | 'tool-approval'
  | 'command'
  | 'menu'
  | 'auth';

type FocusContextValue = {
  activeLayer: FocusLayer;
  focusStack: FocusLayer[];
  pushFocus: (layer: FocusLayer) => void;
  popFocus: () => void;
  setFocus: (layer: FocusLayer) => void;
  hasFocus: (layer: FocusLayer) => boolean;
  isInputActive: () => boolean;
};

const FocusContext = createContext<FocusContextValue | undefined>(undefined);

type FocusProviderProps = {
  children: ReactNode;
  initialLayer?: FocusLayer;
};

export function FocusProvider({ children, initialLayer = 'input' }: FocusProviderProps) {
  const [focusStack, setFocusStack] = useState<FocusLayer[]>([initialLayer]);

  const activeLayer = focusStack[focusStack.length - 1] ?? 'input';

  const pushFocus = useCallback((layer: FocusLayer) => {
    setFocusStack((prev) => [...prev, layer]);
  }, []);

  const popFocus = useCallback(() => {
    setFocusStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const setFocus = useCallback((layer: FocusLayer) => {
    setFocusStack([layer]);
  }, []);

  const hasFocus = useCallback(
    (layer: FocusLayer) => activeLayer === layer,
    [activeLayer],
  );

  const isInputActive = useCallback(
    () => activeLayer === 'input',
    [activeLayer],
  );

  const value: FocusContextValue = {
    activeLayer,
    focusStack,
    pushFocus,
    popFocus,
    setFocus,
    hasFocus,
    isInputActive,
  };

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

export function useFocus() {
  const context = useContext(FocusContext);
  if (!context) {
    throw new Error('useFocus must be used within a FocusProvider');
  }
  return context;
}
```

### Custom Hook: useFocusedInput

```typescript
// packages/nuvin-cli/source/hooks/useFocusedInput.ts

import { useInput, type Key } from 'ink';
import { useFocus, type FocusLayer } from '@/contexts/FocusContext.js';

type InputHandler = (input: string, key: Key) => void;

type UseFocusedInputOptions = {
  override?: boolean; // Force active regardless of focus
};

export function useFocusedInput(
  layer: FocusLayer,
  handler: InputHandler,
  options?: UseFocusedInputOptions,
) {
  const { hasFocus } = useFocus();
  const isActive = options?.override ?? hasFocus(layer);

  useInput(handler, { isActive });
}
```

### Hook: useFocusLayer (for modals/overlays)

```typescript
// packages/nuvin-cli/source/hooks/useFocusLayer.ts

import { useEffect } from 'react';
import { useFocus, type FocusLayer } from '@/contexts/FocusContext.js';

export function useFocusLayer(layer: FocusLayer, active: boolean = true) {
  const { pushFocus, popFocus, hasFocus } = useFocus();

  useEffect(() => {
    if (active) {
      pushFocus(layer);
      return () => popFocus();
    }
  }, [active, layer, pushFocus, popFocus]);

  return hasFocus(layer);
}
```

## Usage Examples

### 1. Main App Setup

```tsx
// app-virtualized.tsx

import { FocusProvider } from '@/contexts/FocusContext.js';

export function App() {
  return (
    <FocusProvider initialLayer="input">
      <MainContent />
    </FocusProvider>
  );
}
```

### 2. InputArea Component

```tsx
// components/InputArea.tsx

import { useFocus } from '@/contexts/FocusContext.js';

export function InputArea() {
  const { hasFocus } = useFocus();

  return (
    <TextInput
      focus={hasFocus('input')}
      // ...
    />
  );
}
```

### 3. Chat/Scroll Area with Tab Toggle

```tsx
// app-virtualized.tsx

import { useFocus } from '@/contexts/FocusContext.js';
import { useFocusedInput } from '@/hooks/useFocusedInput.js';

function MainContent() {
  const { activeLayer, setFocus } = useFocus();

  // Global Tab handler to toggle between input/chat
  useFocusedInput('input', (_input, key) => {
    if (key.tab) {
      setFocus('chat');
    }
  });

  useFocusedInput('chat', (_input, key) => {
    if (key.tab) {
      setFocus('input');
    }
  });

  return (
    <>
      <VirtualizedChat focus={activeLayer === 'chat'} />
      <InputArea />
    </>
  );
}
```

### 4. Modal Component (auto push/pop focus)

```tsx
// components/MCPModal.tsx

import { useFocusLayer } from '@/hooks/useFocusLayer.js';
import { useFocusedInput } from '@/hooks/useFocusedInput.js';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function MCPModal({ visible, onClose }: Props) {
  // Automatically push 'modal' when visible, pop when closed
  const hasFocus = useFocusLayer('modal', visible);

  useFocusedInput('modal', (_input, key) => {
    if (key.escape) {
      onClose();
    }
  });

  if (!visible) return null;

  return (
    <AppModal>
      <SelectInput focus={hasFocus} />
    </AppModal>
  );
}
```

### 5. Tool Approval Prompt

```tsx
// components/ToolApprovalPrompt/ToolApprovalPrompt.tsx

import { useFocusLayer } from '@/hooks/useFocusLayer.js';
import { useFocusedInput } from '@/hooks/useFocusedInput.js';

export function ToolApprovalPrompt({ toolCalls, onApproval }: Props) {
  // Always active when rendered
  useFocusLayer('tool-approval', true);

  useFocusedInput('tool-approval', (input, key) => {
    if (key.return) {
      // handle approval
    }
    if (input === '1') {
      handleToolDecision('approve');
    }
    // ...
  });

  return <AppModal>...</AppModal>;
}
```

### 6. Nested Focus (Menu inside Modal)

```tsx
// components/CommandModal.tsx

import { useFocusLayer } from '@/hooks/useFocusLayer.js';
import { useFocus } from '@/contexts/FocusContext.js';

export function CommandModal({ visible }: Props) {
  const { pushFocus, popFocus } = useFocus();
  const [menuOpen, setMenuOpen] = useState(false);

  // Modal layer
  useFocusLayer('modal', visible);

  // When menu opens, push menu layer on top
  useEffect(() => {
    if (menuOpen) {
      pushFocus('menu');
      return () => popFocus();
    }
  }, [menuOpen]);

  return (
    <AppModal>
      <Button onPress={() => setMenuOpen(true)}>Open Menu</Button>
      {menuOpen && <SelectInput focus={true} />}
    </AppModal>
  );
}
```

### 7. Command Component (Active Command)

```tsx
// modules/commands/definitions/mcp.tsx

import { useFocusLayer } from '@/hooks/useFocusLayer.js';
import { useFocusedInput } from '@/hooks/useFocusedInput.js';

export function MCPCommand({ onClose }: CommandComponentProps) {
  useFocusLayer('command', true);

  useFocusedInput('command', (_input, key) => {
    if (key.escape) {
      onClose();
    }
  });

  return <MCPModal visible onClose={onClose} />;
}
```

### 8. Conditional Focus Override

```tsx
// For global shortcuts that should work regardless of focus layer

import { useInput } from 'ink';

function GlobalShortcuts() {
  // Always active - bypasses focus system for critical shortcuts
  useInput((_input, key) => {
    if (key.ctrl && input === 'c') {
      process.exit(0);
    }
  }, { isActive: true });

  return null;
}
```

## Integration Points

| Component | Layer | Integration Method |
|-----------|-------|-------------------|
| `InputArea` | `input` | `hasFocus('input')` |
| `VirtualizedChat` | `chat` | `hasFocus('chat')` |
| `ToolApprovalPrompt` | `tool-approval` | `useFocusLayer('tool-approval')` |
| `MCPModal` | `modal` | `useFocusLayer('modal', visible)` |
| `ActiveCommand` | `command` | `useFocusLayer('command')` |
| `ComboBox` | `menu` | `useFocusLayer('menu', isOpen)` |
| `OAuthUI` | `auth` | `useFocusLayer('auth')` |
| `HistorySelection` | `modal` | `useFocusLayer('modal')` |

## Migration Strategy

1. **Phase 1**: Create `FocusContext.tsx`, `useFocusedInput.ts`, `useFocusLayer.ts`
2. **Phase 2**: Wrap app with `FocusProvider` in `app-virtualized.tsx`
3. **Phase 3**: Replace local `focusArea` state with context usage
4. **Phase 4**: Update `InputArea` and `InteractionArea` to use context
5. **Phase 5**: Update modal components (MCPModal, ToolApprovalPrompt, etc.)
6. **Phase 6**: Update command definitions to use `useFocusLayer`
7. **Phase 7**: Remove legacy `focus` props where no longer needed

## Benefits

1. **Single Source of Truth** - All focus state in one place
2. **Automatic Focus Restoration** - Stack-based push/pop handles modal close gracefully
3. **Easier Debugging** - Can log `focusStack` to see focus history
4. **Type Safety** - `FocusLayer` union prevents invalid focus targets
5. **Composable** - Hooks make it easy to integrate with any component
6. **Testable** - Context can be mocked for testing

## Files to Create

```
packages/nuvin-cli/source/
├── contexts/
│   └── FocusContext.tsx       # New
├── hooks/
│   ├── useFocusedInput.ts     # New
│   └── useFocusLayer.ts       # New
```

## Files to Modify

```
packages/nuvin-cli/source/
├── app-virtualized.tsx        # Add FocusProvider, remove local focusArea
├── components/
│   ├── InputArea.tsx          # Use useFocus()
│   ├── InteractionArea.tsx    # Use useFocus()
│   ├── MCPModal.tsx           # Use useFocusLayer()
│   ├── ToolApprovalPrompt/
│   │   └── ToolApprovalPrompt.tsx  # Use useFocusLayer()
│   └── auth/
│       ├── OAuthUI.tsx        # Use useFocusLayer()
│       └── DeviceFlowUI.tsx   # Use useFocusLayer()
├── modules/commands/definitions/
│   ├── mcp.tsx                # Use useFocusLayer()
│   ├── history.tsx            # Use useFocusLayer()
│   ├── thinking.tsx           # Use useFocusLayer()
│   └── command.tsx            # Use useFocusLayer()
```
