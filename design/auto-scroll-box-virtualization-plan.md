# AutoScrollBox Virtualization Support Plan

## Overview

This plan outlines adding virtualization support to `AutoScrollBox` component to reduce the number of React components and DOM nodes being processed when displaying large lists of content.

## Ink Architecture Understanding

### Key Findings from Ink Source Code Analysis

**packages/ink/src/components/Box.tsx** - Box component has built-in scroll support:
- Uses `overflow="scroll"` to enable scrolling
- Exposes `scrollTo()`, `getScrollPosition()`, `scrollToBottom()` via BoxRef
- Tracks scroll state via `internal_scrollOffset` and `internal_scrollVersion`

**packages/ink/src/render-node-to-output.ts** - Rendering pipeline:
- Applies scroll offset when rendering children: `offsetY: y - scrollOffset.y`
- Clips content based on overflow settings
- Renders to Output object which manages terminal positioning

**packages/ink/src/dom.ts** - Virtual DOM structure:
- Each React element maps to a `DOMElement` with Yoga node
- Yoga layout calculates dimensions for all children
- Text nodes have custom measure functions

### Critical Virtualization Insight for Ink

In Ink, the virtualization challenge is different from browser-based virtualization:

1. **React component rendering**: We CAN skip rendering React components for off-screen items to reduce reconciliation overhead
2. **DOM node creation**: We STILL need to create DOM elements with Yoga nodes for measurement
3. **Output rendering**: The `renderNodeToOutput` function only outputs visible content due to scroll clipping

**Ink's scroll clipping mechanism**:
```tsx
// render-node-to-output.ts applies scroll offset during traversal
offsetY: y - scrollOffset.y,  // Children are positioned with offset
// And clipping is applied:
output.clip({x1, x2, y1, y2});  // Output only visible region
```

This means even if all children are in the DOM, only visible content gets written to terminal.

## Virtualization Strategy

### Approach: Selective Item Rendering

Instead of skipping all off-screen items, we'll use a hybrid approach:

1. **Render visible items**: Full React component rendering with measurement
2. **Estimate off-screen heights**: Use fixed/estimated heights without full component rendering
3. **Lazy mount on scroll**: Only fully render items when they come into view

### Props Interface

```tsx
type VirtualizedAutoScrollBoxProps<T> = {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  estimatedItemHeight?: number;  // Default: 3 (lines)
  overscan?: number;             // Default: 10 items buffer
  scrollStep?: number;
  enableMouseScroll?: boolean;
  showScrollbar?: boolean;
  scrollbarColor?: string;
  scrollbarTrackColor?: string;
  mousePriority?: number;
  enableKeyboardScroll?: boolean;
  focus?: boolean;
  manualFocus?: boolean;
  onFocusChange?: (focused: boolean) => void;
  onVisibleRangeChange?: (startIndex: number, endIndex: number) => void;
} & Omit<BoxProps, 'ref' | 'overflow' | 'height' | 'children'>;
```

## Implementation Plan

### Phase 1: Height Estimation System

#### 1.1 Create useItemHeights Hook

**File:** `packages/nuvin-cli/source/hooks/useItemHeights.ts`

```tsx
function useItemHeights<T>(options: {
  items: T[];
  estimatedItemHeight: number;
  containerHeight: number;
  scrollY: number;
  overscan: number;
}): {
  visibleRange: {startIndex: number; endIndex: number};
  itemPositions: Map<number, {offsetY: number; height: number}>;
  totalHeight: number;
} {
  // Strategy:
  // 1. Calculate total height as: items.length * estimatedItemHeight
  // 2. Calculate visible range based on scrollY
  // 3. Use a spacer Box to push content to correct scroll position
  
  const visibleStart = Math.max(0, Math.floor(scrollY / estimatedItemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / estimatedItemHeight) + overscan * 2;
  
  return {
    visibleRange: {
      startIndex: visibleStart,
      endIndex: Math.min(items.length - 1, visibleStart + visibleCount),
    },
    itemPositions: new Map(),
    totalHeight: items.length * estimatedItemHeight,
  };
}
```

#### 1.2 Dynamic Height Measurement (Optional Enhancement)

For variable-height items, implement height caching:

```tsx
function useMeasuredHeights<T>(options: {
  items: T[];
  visibleRange: {startIndex: number; endIndex: number};
}): Map<number, number> {
  const heightCache = useRef(new Map<number, number>());
  
  useLayoutEffect(() => {
    // After rendering visible items, measure their actual heights
    // Store in heightCache for future scroll position calculations
  }, [visibleRange]);
  
  return heightCache.current;
}
```

### Phase 2: VirtualizedAutoScrollBox Component

**File:** `packages/nuvin-cli/source/components/VirtualizedAutoScrollBox.tsx`

```tsx
export function VirtualizedAutoScrollBox<T>({
  items,
  renderItem,
  estimatedItemHeight = 3,
  overscan = 10,
  scrollStep = 1,
  enableMouseScroll = true,
  showScrollbar = true,
  scrollbarColor = 'cyan',
  scrollbarTrackColor = 'gray',
  mousePriority = 0,
  enableKeyboardScroll = true,
  focus: externalFocus,
  manualFocus = false,
  onFocusChange,
  ...boxProps
}: VirtualizedAutoScrollBoxProps<T>) {
  const boxRef = useRef<BoxRef>(null);
  const contentRef = useRef<BoxRef>(null);
  const [scrollInfo, setScrollInfo] = useState<ScrollInfo>({
    scrollY: 0,
    containerHeight: 0,
    contentHeight: 0,
  });
  const [visibleRange, setVisibleRange] = useState({startIndex: 0, endIndex: items.length});
  
  const {visibleItems, totalHeight, startOffset} = useMemo(() => {
    const total = items.length * estimatedItemHeight;
    const start = scrollInfo.scrollY;
    
    const visibleStart = Math.max(0, Math.floor(start / estimatedItemHeight) - overscan);
    const visibleEnd = Math.min(
      items.length - 1,
      Math.floor((start + scrollInfo.containerHeight) / estimatedItemHeight) + overscan
    );
    
    setVisibleRange({startIndex: visibleStart, endIndex: visibleEnd});
    
    return {
      visibleItems: items.slice(visibleStart, visibleEnd + 1),
      totalHeight: total,
      startOffset: visibleStart * estimatedItemHeight,
    };
  }, [items, scrollInfo, estimatedItemHeight, overscan]);
  
  // Spacer to push visible items to correct scroll position
  const topSpacer = useMemo(() => startOffset, [startOffset]);
  
  return (
    <Box flexDirection="row" overflow="hidden" {...boxProps}>
      <Box 
        ref={boxRef} 
        overflow="scroll" 
        flexGrow={1} 
        flexDirection="column"
      >
        {/* Top spacer for scroll position */}
        <Box height={topSpacer} />
        
        {/* Visible items */}
        {visibleItems.map((item, index) => (
          <Box key={visibleRange.startIndex + index} flexShrink={0}>
            {renderItem(item, visibleRange.startIndex + index)}
          </Box>
        ))}
        
        {/* Bottom spacer */}
        <Box height={totalHeight - topSpacer - visibleItems.length * estimatedItemHeight} />
      </Box>
      
      {/* Scrollbar */}
      {showScrollbar && scrollInfo.contentHeight > scrollInfo.containerHeight && (
        <Scrollbar 
          scrollInfo={{
            ...scrollInfo,
            contentHeight: totalHeight,
          }}
          color={scrollbarColor}
          trackColor={scrollbarTrackColor}
        />
      )}
    </Box>
  );
}
```

### Phase 3: Scroll Position Management

#### 3.1 Sync Scroll Position with Visible Range

```tsx
useLayoutEffect(() => {
  if (!boxRef.current) return;
  
  const pos = boxRef.current.getScrollPosition();
  setScrollInfo(prev => ({
    ...prev,
    scrollY: pos?.y ?? 0,
  }));
}, [visibleItems.length]);  // Re-calculate on content change
```

#### 3.2 Auto-Scroll Behavior

```tsx
const isUserScrolledRef = useRef(false);

useEffect(() => {
  if (!isUserScrolledRef.current && items.length > prevLength) {
    boxRef.current?.scrollToBottom();
  }
}, [items.length]);
```

### Phase 4: Height Refinement System

For better accuracy, implement a hybrid height system:

```tsx
// Phase 4.1: After visible items mount, measure and refine heights
useLayoutEffect(() => {
  if (!contentRef.current) return;
  
  const measuredHeights: Map<number, number> = new Map();
  
  for (const child of contentRef.current.childNodes) {
    const index = child.getAttribute('data-item-index');
    if (index !== null) {
      const {height} = measureElement(child);
      measuredHeights.set(parseInt(index), height);
    }
  }
  
  // Update total content height based on measurements
  updateTotalHeight(measuredHeights);
}, [visibleRange]);
```

### Phase 5: Integration with FlexLayout

```tsx
export function FlexLayout({...}): React.ReactElement {
  return (
    <Box flexDirection="column" width={width} height={height} paddingX={1}>
      <Box flexDirection="column" flexGrow={1} flexShrink={1} overflow="hidden">
        <VirtualizedAutoScrollBox
          items={mergedMessages}
          renderItem={(message: MessageLineType) => (
            <MessageLine key={message.id} message={message} />
          )}
          estimatedItemHeight={5}  // Average message height in lines
          overscan={15}
          mousePriority={10}
        />
      </Box>
      {/* ... bottom section */}
    </Box>
  );
}
```

## Performance Impact Analysis

### Current Behavior (AutoScrollBox)
- **React components**: All N message components mount and render
- **DOM nodes**: All N items create DOMElement + YogaNode
- **Output**: Only visible lines written to terminal (due to clipping)

### With VirtualizedAutoScrollBox
- **React components**: Only ~visible + overscan items render (e.g., 30-50 instead of 1000)
- **DOM nodes**: Still need placeholder nodes (Box with estimated height)
- **Output**: Same - only visible lines written

### Expected Improvement
| Metric | Before | After |
|--------|--------|-------|
| React reconciliation | O(n) | O(visible) |
| Initial render time | ~500ms | ~50ms |
| Memory (React fiber) | O(n) | O(visible) |

## File Changes Summary

| File | Change |
|------|--------|
| `packages/nuvin-cli/source/components/VirtualizedAutoScrollBox.tsx` | **New** - Virtualized scroll box component |
| `packages/nuvin-cli/source/hooks/useItemHeights.ts` | **New** - Height calculation hook |
| `packages/nuvin-cli/source/components/VirtualizedList/FlexLayout.tsx` | **Update** - Use VirtualizedAutoScrollBox |
| `packages/nuvin-cli/source/hooks/useItemHeights.test.ts` | **New** - Tests |
| `packages/nuvin-cli/source/components/VirtualizedAutoScrollBox.test.tsx` | **New** - Tests |

## Technical Considerations

### 1. Scroll Position Accuracy
- Estimated heights may differ from actual rendered heights
- Solution: Refine heights after visible items mount, adjust scroll position if needed

### 2. Nested Scrollable Content
- `MessageLine` contains `AutoScrollBox` for streaming content
- VirtualizedAutoScrollBox should allow nested scrollable regions

### 3. Dynamic Item Heights
- Messages have variable height based on content length
- Implementation approach:
  - Phase 1: Fixed estimated height
  - Phase 2: Add measurement and cache

### 4. Scrollbar Calculation
- Total height must be accurate for scrollbar thumb position
- Use estimated height initially, refine with measurements

## Testing Strategy

### Unit Tests
- Visible range calculation
- Scroll offset computation
- Overscan boundary handling

### Integration Tests
- FlexLayout with 100+ messages
- Auto-scroll on new message
- Scroll position maintenance

### Performance Tests
- Render time measurement with N messages
- Memory profiling

## Migration Steps

1. Create `VirtualizedAutoScrollBox` with fixed-height estimation
2. Add `useItemHeights` hook for range calculations
3. Update `FlexLayout` to use virtualization
4. Test with real chat histories
5. Add dynamic height measurement (Phase 2)
6. Consider feature flag for gradual rollout

## Related Files

- `packages/nuvin-cli/source/components/AutoScrollBox.tsx` - Base component
- `packages/nuvin-cli/source/components/VirtualizedList/FlexLayout.tsx` - Main consumer
- `packages/nuvin-cli/source/components/MessageLine.tsx` - Rendered item
- `packages/ink/src/components/Box.tsx` - Scroll container implementation
- `packages/ink/src/render-node-to-output.ts` - Rendering pipeline
- `design/virtualized-view-implementation.md` - Broader strategy
