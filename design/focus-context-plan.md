# Focus Context Implementation Plan

## Problem Statement

When `AutoScrollBox` handles keyboard shortcuts (j/k/g/G) for scrolling, it conflicts with input fields where users need to type these characters. Multiple scrollable components also need a way to determine which one should receive navigation commands.

## Solution Overview

Create a global `FocusContext` that tracks which component currently has focus. Each component checks if it's focused before handling input. Components decide their own behavior based on what input they receive.

## Design

### FocusContext API

```ts
interface FocusContextValue {
  id: string;  // Auto-generated unique ID for this component
  isFocused: boolean;  // True if this component has focus
  focus: () => void;  // Set focus to this component
  clearFocus: () => void;  // Clear all focus
}
```

**Note**: Each call to `useFocus()` gets a unique ID and returns whether that specific instance is focused.

### Component Behavior

**AutoScrollBox**
- Needs unique `id` prop (optional, auto-generated if not provided)
- Only handles j/k/g/G when `focusedId === myId`
- Returns `true` from handler to consume these keys when focused
- Calls `setFocus(myId)` on click (if clicking outside current focused element)

**Input/Text Fields**
- Needs unique `id` prop
- When focused, handles all keyboard input including j/k/g/G for typing
- Returns `true` from handler when focused (consumes all keys)
- Calls `setFocus(myId)` on focus/click

**Other Components**
- Can participate in focus system similarly
- Check `focusedId === myId` before handling input

## Implementation Steps

### 1. Create FocusContext Files

**File**: `packages/nuvin-cli/source/contexts/InputContext/FocusContext.tsx`

```tsx
import { createContext, useContext, useState, useCallback, useMemo, useId, ReactNode } from 'react';

interface FocusContextInternal {
  focusedId: string | null;
  setFocusedId: (id: string) => void;
  clearFocus: () => void;
}

interface FocusContextValue {
  id: string;
  isFocused: boolean;
  focus: () => void;
  clearFocus: () => void;
}

const FocusContext = createContext<FocusContextInternal | undefined>(undefined);

export function FocusProvider({ children }: { children: ReactNode }) {
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const clearFocus = useCallback(() => {
    setFocusedId(null);
  }, []);

  const value = useMemo(
    () => ({ focusedId, setFocusedId, clearFocus }),
    [focusedId, clearFocus]
  );

  return (
    <FocusContext.Provider value={value}>
      {children}
    </FocusContext.Provider>
  );
}

export function useFocus(): FocusContextValue {
  const context = useContext(FocusContext);
  if (!context) {
    throw new Error('useFocus must be used within a FocusProvider');
  }

  const id = useId();
  const { focusedId, setFocusedId, clearFocus } = context;

  const isFocused = focusedId === id;

  const focus = useCallback(() => {
    setFocusedId(id);
  }, [id, setFocusedId]);

  return useMemo(
    () => ({ id, isFocused, focus, clearFocus }),
    [id, isFocused, focus, clearFocus]
  );
}
```

### 2. Update InputProvider to Include FocusProvider

**File**: `packages/nuvin-cli/source/contexts/InputContext/InputProvider.tsx`

Wrap existing provider content with `FocusProvider`:

```tsx
<FocusProvider>
  {/* existing InputProvider content */}
</FocusProvider>
```

### 3. Export from Index

**File**: `packages/nuvin-cli/source/contexts/InputContext/index.ts`

```ts
export { useFocus, FocusProvider } from './FocusContext.js';
```

### 4. Update AutoScrollBox to Use Focus

**File**: `packages/nuvin-cli/source/components/AutoScrollBox.tsx`

Changes:
- Import and use `useFocus` (ID is auto-generated)
- Update `handleKeyboardEvent` to check `isFocused` before handling j/k/g/G
- Optionally call `focus()` on box click

```tsx
import { useFocus } from '../contexts/InputContext/index.js';

type AutoScrollBoxProps = {
  // ... existing props (no id prop needed)
} & Omit<BoxProps, 'ref' | 'overflow' | 'height'>;

export function AutoScrollBox(props: AutoScrollBoxProps) {
  const { isFocused, focus } = useFocus();

  const handleKeyboardEvent = useCallback((input: string, key: Key) => {
    if (!isFocused || !needsScrollbar || !enableKeyboardScroll) {
      if (isFocused && (input === 'j' || input === 'k' || input === 'g' || input === 'G')) {
        // Consume navigation keys when focused but no scrolling needed
        return true;
      }
      return;
    }

    if (input === 'j') {
      scrollBy(scrollStep);
      return true;
    }
    if (input === 'k') {
      scrollBy(-scrollStep);
      return true;
    }
    if (input === 'g') {
      boxRef.current?.scrollTo({ x: 0, y: 0 });
      return true;
    }
    if (input === 'G') {
      boxRef.current?.scrollToBottom();
      return true;
    }
  }, [isFocused, scrollBy, scrollStep, needsScrollbar]);

  // Optional: Call focus() on click
  useMouse((event) => {
    if (event.type === 'click') {
      focus();
    }
  }, {});
}
```

### 5. Consider Click Handling for Focus

AutoScrollBox needs to capture clicks to set focus. This can be done by:
- Adding an `onClick` handler to the outer Box
- Or using useMouse to detect click events within the box

```tsx
useMouse((event) => {
  if (event.type === 'click') {
    setFocus(id);
  }
}, {});
```

## How It Works

### Scenario 1: AutoScrollBox Only

1. Nothing focused: `focusedId = null`
2. User presses 'j': AutoScrollBox doesn't handle (not focused)
3. User clicks AutoScrollBox: `setFocus('autoscroll-1')`
4. User presses 'j': AutoScrollBox handles scroll down

### Scenario 2: Input and AutoScrollBox

1. Input clicked: Input calls `setFocus('input-1')`
2. User types 'j': Input handles as character (focused)
3. User presses 'G': Input handles as character (focused)
4. User clicks AutoScrollBox: AutoScrollBox calls `setFocus('autoscroll-1')`
5. User presses 'j': AutoScrollBox scrolls down (focused)

### Scenario 3: Multiple AutoScrollBoxes

1. ScrollBox A clicked: `setFocus('scroll-a')`
2. User presses 'j': ScrollBox A scrolls (focused)
3. User presses 'k': ScrollBox A scrolls up (focused)
4. User clicks ScrollBox B: `setFocus('scroll-b')`
5. User presses 'j': ScrollBox B scrolls (focused)

## Alternative Approach (if needed)

If auto-focus on click feels too aggressive, could add config:

```tsx
type AutoScrollBoxProps = {
  // ...
  focusable?: boolean; // default: false - doesn't auto-focus
}
```

Or have a separate "navigation mode" toggle that users press to switch between editing and navigation.

## Migration Notes

### For Existing Components

Phases 1-3 handle the core migration:
- **Phase 2**: TextInput gets focus management
- **Phase 3**: AutoScrollBox gets focus checking
- **Phase 5**: Components register as focusable for cycling

Other interactive components (Select, ComboBox, etc.) can follow the same pattern:
1. Call `useFocus()` hook - ID is auto-generated
2. Check `isFocused` before handling keyboard input
3. Call `focus()` when component becomes active
4. Call `register()` in useEffect for Tab cycling (Phase 5)

### Backward Compatibility

- `id` prop is optional - auto-generated with `useId()`
- Existing behavior mostly preserved - just adds new focus management
- Keyboard shortcuts only work when explicitly focused
- Phase 5 features are purely additive - existing code continues to work

## Edge Cases

1. **No focus needed**: `focusedId = null` - nothing handles navigation keys
2. **Auto-focus first**: App could call `setFocus('default-box')` on mount
3. **Escape clears focus**: Components could bind Escape to `clearFocus()`

## Implementation Phases

### Phase 1: Core FocusContext Implementation
**Goal**: Create the foundation for focus management

**Tasks**:
1. Create `FocusContext.tsx` with basic API (steps 1-3 above)
2. Wrap `InputProvider` with `FocusProvider`
3. Export `useFocus` hook from index

**Validation**: FocusContext is available throughout the app

### Phase 2: TextInput Focus Integration
**Goal**: Ensure TextInput properly consumes input when focused

**Tasks**:
1. Update TextInput to accept optional `id` prop
2. Call `setFocus(id)` when TextInput becomes focused
3. Ensure TextInput handler returns `true` when focused and handling input
4. Test that focused TextInput prevents input propagation

**Validation**: TextInput blocks all keyboard input from reaching other handlers when focused

### Phase 3: AutoScrollBox Focus Integration
**Goal**: Make AutoScrollBox respect focus for navigation keys

**Tasks**:
1. Add optional `id` prop to AutoScrollBox (auto-generate with `useId` if not provided)
2. Use `useFocus` hook to track focus state
3. Update `handleKeyboardEvent` to check `isFocused` before handling j/k/g/G
4. Add click handling to call `setFocus(id)` (optional - start simple)

**Validation**: AutoScrollBox only scrolls with j/k/g/G when focused

### Phase 4: Focus Indicators & UX
**Goal**: Provide visual feedback for focus state

**Tasks**:
1. Add visual indicator to AutoScrollBox when focused
   ```tsx
   const { isFocused } = useFocus();
   
   <Box
     borderStyle="round"
     borderColor={isFocused ? 'cyan' : 'dim'}
     // ... other props
   >
   ```
2. Add focus indicator to TextInput (cursor already provides this)
3. Consider adding focus breadcrumb in app status bar
4. Add default focus on app mount (typically to input area)

**Validation**: Users can clearly see which component has focus

### Phase 5: Focus Switching & Navigation
**Goal**: Allow users to switch focus between components using keyboard shortcuts

**Tasks**:
1. Extend FocusContext to track focusable components:
   ```tsx
   interface FocusContextValue {
     focusedId: string | null;
     focusableIds: string[];
     setFocus: (id: string) => void;
     clearFocus: () => void;
     isFocused: (id: string) => boolean;
     registerFocusable: (id: string) => () => void;
     cycleFocus: (direction?: 'forward' | 'backward') => void;
   }
   ```

2. Update FocusProvider implementation:
   ```tsx
   export function FocusProvider({ children }: { children: ReactNode }) {
     const [focusedId, setFocusedId] = useState<string | null>(null);
     const focusableIdsRef = useRef<Set<string>>(new Set());

     const registerFocusable = useCallback((id: string) => {
       focusableIdsRef.current.add(id);
       return () => {
         focusableIdsRef.current.delete(id);
       };
     }, []);

     const cycleFocus = useCallback((direction: 'forward' | 'backward' = 'forward') => {
       const ids = Array.from(focusableIdsRef.current);
       if (ids.length === 0) return;

       const currentIndex = focusedId ? ids.indexOf(focusedId) : -1;
       let nextIndex: number;

       if (direction === 'forward') {
         nextIndex = (currentIndex + 1) % ids.length;
       } else {
         nextIndex = currentIndex <= 0 ? ids.length - 1 : currentIndex - 1;
       }

       setFocusedId(ids[nextIndex] || null);
     }, [focusedId]);

     // ... rest of implementation
   }
   ```

3. Update components to register as focusable:
   ```tsx
   // In AutoScrollBox
   const { isFocused, focus, register } = useFocus();

   useEffect(() => {
     return register();
   }, [register]);
   ```

4. Add global focus switching shortcut in app:
   ```tsx
   // In app.tsx or app-virtualized.tsx
   const { cycleFocus } = useFocusCycle();

   useInput((input, key) => {
     // Ctrl+W to cycle focus forward
     if (key.ctrl && input === 'w') {
       cycleFocus('forward');
       return true;
     }

     // Ctrl+Shift+W to cycle focus backward
     if (key.ctrl && key.shift && input === 'w') {
       cycleFocus('backward');
       return true;
     }

     // Tab to cycle focus forward (alternative)
     if (key.tab && !key.shift) {
       cycleFocus('forward');
       return true;
     }

     // Shift+Tab to cycle focus backward
     if (key.tab && key.shift) {
       cycleFocus('backward');
       return true;
     }
   }, { priority: 1000 }); // Very high priority to intercept first
   ```

5. Document focus shortcuts in help/readme

**Validation**:
- Users can press Ctrl+W (or Tab) to cycle through focusable components
- Focus indicator moves to the next component in sequence
- Keyboard shortcuts work correctly for the newly focused component

**Alternative Shortcuts**:
- `Ctrl+W` / `Ctrl+Shift+W`: Cycle forward/backward (tmux/screen-like)
- `Tab` / `Shift+Tab`: Standard UI navigation pattern
- `Ctrl+N` / `Ctrl+P`: Vim-like next/previous
- `F6` / `Shift+F6`: Eclipse/IntelliJ-style panel switching

**Considerations**:
- Tab might conflict with TextInput tab completion or indentation
- Choose shortcut that doesn't conflict with common terminal or vim bindings
- Make focus switching optional/configurable

## Future Enhancements

1. **Focus history**: Remember last focused component and restore on return (Ctrl+Tab style)
2. **Visibility-based focus**: Auto-focus when component becomes visible (e.g., modal opens)
3. **Focus groups**: Group related focusable components (e.g., all inputs in a form)
4. **Focus trapping**: Keep focus within modals/overlays until closed
5. **Programmatic focus**: Allow parent components to focus children imperatively
6. **Focus persistence**: Remember focus state across app sessions
