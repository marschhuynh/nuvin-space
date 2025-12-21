# Virtualized View Implementation Plan

## Problem Statement

The current ink rendering model has issues when mixing static (scrollable history) and dynamic (input area, menus) content:

1. **Static component** (`<Static>`) renders content permanently above everything else - once rendered, it stays
2. **Dynamic content** is re-rendered on each update using `log-update` which erases and redraws
3. When dynamic content height changes (e.g., command menu opens/closes), the layout shifts causing visual artifacts
4. The `overflow: hidden` on parent containers clips absolutely positioned elements

## Current Ink Architecture

```
┌─────────────────────────────────────────┐
│ Static Output (written once, stays)     │  ← Written directly to stdout
│ - Completed logs                        │
│ - Previous messages                     │
├─────────────────────────────────────────┤
│ Dynamic Output (re-rendered each frame) │  ← Managed by log-update
│ - Current UI                            │     (erases previous, writes new)
│ - Input area                            │
│ - Menus, overlays                       │
└─────────────────────────────────────────┘
```

### Key Files:
- `ink.tsx` - Main Ink class, orchestrates rendering
- `renderer.ts` - Separates static and dynamic output
- `log-update.ts` - Handles terminal output (erase + redraw)
- `Static.tsx` - Component for permanent output
- `render-node-to-output.ts` - Converts React tree to terminal output

## Proposed Solution: Virtualized Full-Screen View

Instead of mixing static and dynamic content, implement a virtualized full-screen approach where:

1. **Fixed layout structure** - The screen is divided into fixed regions
2. **Virtualized scrollable area** - Chat history is virtualized (only visible rows rendered)
3. **Fixed bottom section** - Input area and footer always at bottom with fixed height
4. **Overlay support** - Menus render as overlays using z-index

### Layout Structure

```
┌─────────────────────────────────────────┐
│ Header (optional, fixed height)         │ height: 1-2 rows
├─────────────────────────────────────────┤
│                                         │
│ Virtualized Scroll Area                 │ height: terminal.rows - header - footer
│ - Only renders visible rows             │
│ - Maintains scroll position             │
│ - Supports smooth scrolling             │
│                                         │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ Command Menu (overlay, z-index: 10) │ │ ← Absolutely positioned
│ └─────────────────────────────────────┘ │    above input when visible
│ Input Area (fixed height)               │ height: 1-2 rows
├─────────────────────────────────────────┤
│ Footer (fixed height)                   │ height: 1-2 rows
└─────────────────────────────────────────┘
```

## Implementation Tasks

### Phase 1: Core Virtualized List Component

#### 1.1 Create `VirtualizedList` component

```tsx
// packages/ink/src/components/VirtualizedList.tsx

type VirtualizedListProps<T> = {
  items: T[];
  height: number;              // Visible height in rows
  itemHeight: number | ((item: T, index: number) => number);
  renderItem: (item: T, index: number) => ReactNode;
  scrollOffset?: number;       // Controlled scroll position
  onScroll?: (offset: number) => void;
  overscan?: number;           // Extra items to render above/below
};
```

**Features:**
- Calculate which items are visible based on scroll position
- Only render visible items + overscan buffer
- Support variable height items
- Expose scroll control via ref

#### 1.2 Create `useVirtualization` hook

```tsx
// packages/ink/src/hooks/useVirtualization.ts

function useVirtualization<T>(options: {
  items: T[];
  containerHeight: number;
  itemHeight: number | ((item: T, index: number) => number);
  overscan?: number;
}) {
  // Returns:
  // - visibleItems: items to render
  // - startIndex: first visible item index
  // - endIndex: last visible item index  
  // - totalHeight: total content height
  // - offsetY: Y offset for first visible item
}
```

### Phase 2: Fixed Layout Container

#### 2.1 Create `FixedLayout` component

```tsx
// packages/ink/src/components/FixedLayout.tsx

type FixedLayoutProps = {
  header?: ReactNode;
  footer?: ReactNode;
  headerHeight?: number;
  footerHeight?: number;
  children: ReactNode;  // Main scrollable content
};
```

**Behavior:**
- Header and footer are fixed position
- Children fill remaining space
- Handles terminal resize

### Phase 3: Overlay System

#### 3.1 Enhance absolute positioning

The current implementation already supports `position: absolute` and `zIndex`. Need to ensure:
- Overlays render on top regardless of DOM order
- Parent `overflow: hidden` doesn't clip overlays (may need portal-like behavior)

#### 3.2 Create `Overlay` component

```tsx
// packages/ink/src/components/Overlay.tsx

type OverlayProps = {
  visible: boolean;
  anchor: 'top' | 'bottom';  // Anchor point
  offset?: number;            // Offset from anchor
  children: ReactNode;
};
```

### Phase 4: Integration with nuvin-cli

#### 4.1 Update ChatDisplay

```tsx
// Use VirtualizedList for message history
<VirtualizedList
  items={messages}
  height={availableHeight}
  itemHeight={(msg) => calculateMessageHeight(msg)}
  renderItem={(msg, i) => <MessageRow message={msg} />}
/>
```

#### 4.2 Update InputArea

```tsx
// Command menu as overlay
<Box position="relative">
  {showMenu && (
    <Overlay visible={showMenu} anchor="bottom" offset={1}>
      <CommandMenu items={filteredItems} />
    </Overlay>
  )}
  <InputLine />
</Box>
```

## Technical Considerations

### Height Calculation

For virtualization, we need accurate height calculations:

```tsx
function calculateMessageHeight(message: MessageLine, width: number): number {
  // Account for:
  // - Text wrapping based on terminal width
  // - Code blocks, borders
  // - Multi-line content
}
```

### Scroll Position Management

```tsx
// Auto-scroll to bottom for new messages
useEffect(() => {
  if (isAtBottom && messages.length > prevLength) {
    scrollToBottom();
  }
}, [messages.length]);

// Maintain position when content above changes
useEffect(() => {
  if (!isAtBottom) {
    maintainScrollPosition();
  }
}, [contentHeight]);
```

### Performance Optimizations

1. **Memoization** - Memoize rendered items
2. **Debounced scroll** - Debounce scroll event handlers
3. **Incremental rendering** - Use ink's incremental rendering mode
4. **Height caching** - Cache calculated item heights

## File Changes Summary

| File | Change |
|------|--------|
| `packages/ink/src/components/VirtualizedList.tsx` | New - Core virtualized list |
| `packages/ink/src/components/FixedLayout.tsx` | New - Fixed header/footer layout |
| `packages/ink/src/components/Overlay.tsx` | New - Overlay component |
| `packages/ink/src/hooks/useVirtualization.ts` | New - Virtualization logic |
| `packages/ink/src/index.ts` | Export new components |
| `packages/nuvin-cli/source/components/ChatDisplay.tsx` | Update to use VirtualizedList |
| `packages/nuvin-cli/source/components/InputArea.tsx` | Update menu to use Overlay |
| `packages/nuvin-cli/source/app.tsx` | Update to use FixedLayout |

## Alternative: Portal-based Overlay

If absolute positioning continues to have clipping issues, implement a portal system:

```tsx
// OverlayPortal renders children at root level
const OverlayContext = createContext<{
  mount: (id: string, content: ReactNode) => void;
  unmount: (id: string) => void;
}>();

// In App root:
<OverlayProvider>
  <MainContent />
  <OverlayContainer /> {/* Renders all mounted overlays */}
</OverlayProvider>
```

## Testing Strategy

1. **Unit tests** - Test virtualization calculations
2. **Visual tests** - Snapshot tests for rendered output
3. **Integration tests** - Test scroll behavior, overlay positioning
4. **Performance tests** - Measure render time with large item counts

## Migration Path

1. Implement core components in ink package
2. Create parallel implementation in nuvin-cli (feature flag)
3. Test thoroughly with different terminal sizes
4. Gradually migrate existing components
5. Remove old implementation
