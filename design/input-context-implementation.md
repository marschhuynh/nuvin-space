# Centralized Input Management System

## Purpose

Replace ink's `useInput` with a custom implementation that provides full control over input handling across the CLI application.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      InputProvider                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  stdin listener → parseKeypress → InputContext         │ │
│  │                                                        │ │
│  │  • Focus Stack (modal/overlay priority)                │ │
│  │  • Middleware Chain (Ctrl+C, paste, global handlers)   │ │
│  │  • Subscriber Registry (component → handler mapping)   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        useInput()      useInput()      useInput()
        (TextInput)     (InputArea)     (Modal)
```

## Key Components

| Component | Responsibility |
|-----------|---------------|
| **InputContext** | Stores input state, subscriber registry, focus stack |
| **InputProvider** | Single stdin listener, parses input, distributes to subscribers |
| **useInput** | Hook for components to subscribe with `isActive`/priority support |
| **Middleware** | Pre-processing layer for global handlers (Ctrl+C, paste detection) |

## Input Distribution Strategy

1. **Middleware first** - Global handlers (Ctrl+C exit, paste detection)
2. **Focus stack** - Topmost focused component gets priority (modals > base UI)
3. **Active subscribers** - Only components with `isActive: true` receive input
4. **Stop propagation** - Handlers can stop input from reaching lower-priority subscribers

## Files to Create

```
packages/nuvin-cli/source/contexts/InputContext/
├── InputContext.tsx      # Context definition
├── InputProvider.tsx     # Provider with stdin management
├── useInput.ts           # Custom hook (replacement)
├── types.ts              # Type definitions
├── middleware.ts         # Built-in middleware (Ctrl+C, paste)
└── index.ts              # Exports
```

## Type Definitions

```typescript
// types.ts

export type Key = {
  upArrow: boolean;
  downArrow: boolean;
  leftArrow: boolean;
  rightArrow: boolean;
  pageDown: boolean;
  pageUp: boolean;
  return: boolean;
  escape: boolean;
  ctrl: boolean;
  shift: boolean;
  tab: boolean;
  backspace: boolean;
  delete: boolean;
  meta: boolean;
};

export type InputHandler = (input: string, key: Key) => void | boolean;

export type InputMiddleware = (
  input: string,
  key: Key,
  next: () => void
) => void;

export type Subscriber = {
  id: string;
  handler: InputHandler;
  priority: number;
  isActive: boolean;
};

export type UseInputOptions = {
  isActive?: boolean;
  priority?: number; // Higher = handled first (modals = 100, base = 0)
};

export type InputContextValue = {
  subscribe: (handler: InputHandler, options?: UseInputOptions) => () => void;
  setRawMode: (value: boolean) => void;
  isRawModeSupported: boolean;
  pushFocus: (id: string) => void;
  popFocus: (id: string) => void;
  currentFocus: string | null;
};
```

## InputProvider Implementation

```typescript
// InputProvider.tsx

import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { useStdin } from 'ink';
import { InputContext } from './InputContext.js';
import { parseKeypress } from './parseKeypress.js';
import type { Subscriber, InputMiddleware, InputContextValue } from './types.js';

type Props = {
  children: React.ReactNode;
  middleware?: InputMiddleware[];
  exitOnCtrlC?: boolean;
};

export const InputProvider: React.FC<Props> = ({
  children,
  middleware = [],
  exitOnCtrlC = false
}) => {
  const { stdin, setRawMode, isRawModeSupported } = useStdin();
  const subscribersRef = useRef<Map<string, Subscriber>>(new Map());
  const focusStackRef = useRef<string[]>([]);
  const idCounterRef = useRef(0);

  const subscribe = useCallback((
    handler: InputHandler,
    options: UseInputOptions = {}
  ) => {
    const id = `sub_${++idCounterRef.current}`;
    const subscriber: Subscriber = {
      id,
      handler,
      priority: options.priority ?? 0,
      isActive: options.isActive ?? true,
    };

    subscribersRef.current.set(id, subscriber);

    return () => {
      subscribersRef.current.delete(id);
    };
  }, []);

  const pushFocus = useCallback((id: string) => {
    focusStackRef.current.push(id);
  }, []);

  const popFocus = useCallback((id: string) => {
    const index = focusStackRef.current.lastIndexOf(id);
    if (index !== -1) {
      focusStackRef.current.splice(index, 1);
    }
  }, []);

  const distributeInput = useCallback((input: string, key: Key) => {
    // Sort subscribers by priority (descending)
    const sortedSubscribers = Array.from(subscribersRef.current.values())
      .filter(s => s.isActive)
      .sort((a, b) => b.priority - a.priority);

    for (const subscriber of sortedSubscribers) {
      const result = subscriber.handler(input, key);
      // If handler returns true, stop propagation
      if (result === true) break;
    }
  }, []);

  useEffect(() => {
    if (!isRawModeSupported) return;

    setRawMode(true);

    const handleData = (data: Buffer) => {
      const str = data.toString('utf-8');
      const { input, key } = parseKeypress(str);

      // Run through middleware chain
      let index = 0;
      const next = () => {
        if (index < middleware.length) {
          middleware[index++](input, key, next);
        } else {
          distributeInput(input, key);
        }
      };

      // Handle Ctrl+C if exitOnCtrlC is false
      if (input === 'c' && key.ctrl && !exitOnCtrlC) {
        next();
        return;
      }

      next();
    };

    stdin.on('data', handleData);

    return () => {
      stdin.off('data', handleData);
      setRawMode(false);
    };
  }, [stdin, setRawMode, isRawModeSupported, middleware, distributeInput, exitOnCtrlC]);

  const contextValue: InputContextValue = useMemo(() => ({
    subscribe,
    setRawMode,
    isRawModeSupported,
    pushFocus,
    popFocus,
    currentFocus: focusStackRef.current[focusStackRef.current.length - 1] ?? null,
  }), [subscribe, setRawMode, isRawModeSupported, pushFocus, popFocus]);

  return (
    <InputContext.Provider value={contextValue}>
      {children}
    </InputContext.Provider>
  );
};
```

## useInput Hook Implementation

```typescript
// useInput.ts

import { useEffect, useRef, useContext } from 'react';
import { InputContext } from './InputContext.js';
import type { InputHandler, UseInputOptions } from './types.js';

export const useInput = (
  handler: InputHandler,
  options: UseInputOptions = {}
) => {
  const { subscribe } = useContext(InputContext);
  const handlerRef = useRef(handler);
  const optionsRef = useRef(options);

  // Keep refs updated
  useEffect(() => {
    handlerRef.current = handler;
    optionsRef.current = options;
  });

  useEffect(() => {
    if (options.isActive === false) return;

    const wrappedHandler: InputHandler = (input, key) => {
      return handlerRef.current(input, key);
    };

    return subscribe(wrappedHandler, {
      isActive: options.isActive,
      priority: options.priority,
    });
  }, [subscribe, options.isActive, options.priority]);
};
```

## Built-in Middleware

```typescript
// middleware.ts

import type { InputMiddleware } from './types.js';
import { eventBus } from '@/services/EventBus.js';

export const ctrlCMiddleware: InputMiddleware = (input, key, next) => {
  if (key.ctrl && input === 'c') {
    eventBus.emit('ui:keyboard:ctrlc', undefined);
    return; // Don't propagate Ctrl+C
  }
  next();
};

export const pasteDetectionMiddleware: InputMiddleware = (input, key, next) => {
  // Detect paste start sequence
  if (input.startsWith('\x1b[200~')) {
    eventBus.emit('ui:keyboard:paste:start', undefined);
  }
  next();
};

export const defaultMiddleware: InputMiddleware[] = [
  ctrlCMiddleware,
  pasteDetectionMiddleware,
];
```

## Migration Path

### Phase 1: Create Infrastructure
1. Create `InputContext/` directory structure
2. Implement `InputContext`, `InputProvider`, `useInput`
3. Implement middleware system

### Phase 2: Integrate Provider
1. Wrap app root with `InputProvider`
2. Configure middleware (Ctrl+C handling, paste detection)

### Phase 3: Migrate Components (gradual)
Priority order:
1. `TextInput/TextInput.tsx` - Core input component
2. `InputArea.tsx` - Main input area
3. `useKeyboardInput.ts` - Global keyboard handler
4. Modal components (CommandModal, AgentModal, MCPModal)
5. Selection components (HistorySelection, SelectInput)
6. Command definition components

### Phase 4: Cleanup
1. Remove ink's `useInput` imports
2. Remove `useKeyboardInput.ts` (absorbed into middleware)
3. Update `useGlobalKeyboard.ts` to use new system

## Components to Migrate

```
packages/nuvin-cli/source/components/TextInput/TextInput.tsx
packages/nuvin-cli/source/components/InputArea.tsx
packages/nuvin-cli/source/components/SelectInput/SelectInput.tsx
packages/nuvin-cli/source/components/ComboBox/ComboBox.tsx
packages/nuvin-cli/source/components/HistorySelection.tsx
packages/nuvin-cli/source/components/ToolApprovalPrompt/ToolApprovalPrompt.tsx
packages/nuvin-cli/source/components/ToolApprovalPrompt/ToolEditInput.tsx
packages/nuvin-cli/source/components/CommandModal/useCommandModalKeyboard.ts
packages/nuvin-cli/source/components/AgentModal/useAgentModalKeyboard.ts
packages/nuvin-cli/source/components/AgentCreation/useAgentCreationKeyboard.ts
packages/nuvin-cli/source/components/AgentCreation/ToolSelectInput.tsx
packages/nuvin-cli/source/components/CommandCreation/CommandCreation.tsx
packages/nuvin-cli/source/components/MCPModal.tsx
packages/nuvin-cli/source/components/AppModal.tsx
packages/nuvin-cli/source/components/InitialConfigSetup.tsx
packages/nuvin-cli/source/components/VirtualizedChat/VirtualizedChat.tsx
packages/nuvin-cli/source/components/auth/OAuthUI.tsx
packages/nuvin-cli/source/components/auth/DeviceFlowUI.tsx
packages/nuvin-cli/source/modules/commands/definitions/*.tsx
packages/nuvin-cli/source/hooks/useKeyboardInput.ts
packages/nuvin-cli/source/app-virtualized.tsx
```

## Priority Levels Convention

| Priority | Use Case |
|----------|----------|
| 0 | Base components (TextInput, SelectInput) |
| 10 | Container components (InputArea, VirtualizedChat) |
| 50 | Overlays (ComboBox dropdown, suggestions) |
| 100 | Modals (CommandModal, AgentModal, etc.) |
| 200 | Critical dialogs (ToolApprovalPrompt, exit confirmation) |

## Benefits

1. **Single source of truth** - One place manages all stdin handling
2. **Priority system** - Modals naturally override base input
3. **Middleware** - Global handlers without scattered `useInput` calls
4. **Stop propagation** - Prevent input from reaching lower layers
5. **Testability** - Mock `InputContext` for unit tests
6. **Focus management** - Explicit focus stack for complex UI states
