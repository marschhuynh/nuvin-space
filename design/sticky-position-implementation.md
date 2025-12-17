# Sticky Position Implementation Plan

## Overview

Implement `position="sticky"` support for Box components within scroll containers, similar to CSS `position: sticky`.

## Behavior

A sticky element:
1. Positions normally in document flow during layout
2. When scrolled past its threshold, "sticks" to the scroll container edge
3. Unsticks when its original position comes back into view

```tsx
<Box overflow="scroll" height={10}>
  <Box position="sticky" top={0}>
    <Text bold>Sticky Header</Text>
  </Box>
  {items.map(item => (
    <Text key={item}>{item}</Text>
  ))}
</Box>
```

## Visual Example

```
Initial state (scrollY=0):
┌──────────────────┐
│ Sticky Header    │  ← at original position (row 0)
│ Item 1           │
│ Item 2           │
│ Item 3           │
│ Item 4           │
└──────────────────┘

Scrolled (scrollY=3):
┌──────────────────┐
│ Sticky Header    │  ← stuck at top=0 (would be at row -3)
│ Item 4           │
│ Item 5           │
│ Item 6           │
│ Item 7           │
└──────────────────┘

Scrolled back (scrollY=0):
┌──────────────────┐
│ Sticky Header    │  ← back to original position
│ Item 1           │
│ Item 2           │
│ Item 3           │
│ Item 4           │
└──────────────────┘
```

## Implementation Steps

### Step 1: Update Styles Types (`src/styles.ts`)

Add `sticky` to position type and sticky offset properties:

```typescript
export type Styles = {
  // ... existing styles
  
  readonly position?: 'absolute' | 'relative' | 'sticky';
  
  // Sticky offsets (only apply when position="sticky")
  readonly stickyTop?: number;
  readonly stickyBottom?: number;
  readonly stickyLeft?: number;
  readonly stickyRight?: number;
};
```

**Alternative**: Reuse existing `top`, `bottom`, `left`, `right` properties when `position="sticky"`.

### Step 2: Update DOM Types (`src/dom.ts`)

Add sticky context tracking to DOMElement:

```typescript
export type DOMElement = {
  // ... existing fields
  
  // Sticky element tracking (set during render)
  internal_stickyContext?: {
    scrollContainer: DOMElement;
    originalPosition: {x: number; y: number};
    stickyOffsets: {top?: number; bottom?: number; left?: number; right?: number};
  };
} & InkNode;
```

### Step 3: Update Render Pipeline (`src/render-node-to-output.ts`)

This is the core implementation. Modify the rendering to handle sticky positioning.

#### 3.1 Track Scroll Container Context

Pass scroll container reference down during rendering:

```typescript
type RenderContext = {
  offsetX: number;
  offsetY: number;
  transformers: OutputTransformer[];
  skipStaticElements: boolean;
  scrollContainer?: DOMElement;  // NEW: nearest scroll ancestor
  scrollOffset?: {x: number; y: number};  // NEW: current scroll offset
};
```

#### 3.2 Identify Scroll Containers

When rendering a node with `overflow="scroll"`:

```typescript
if (node.nodeName === 'ink-box') {
  const isScrollContainer = 
    node.style.overflow === 'scroll' ||
    node.style.overflowX === 'scroll' ||
    node.style.overflowY === 'scroll';
  
  if (isScrollContainer) {
    // Pass this node as scrollContainer to children
    newContext.scrollContainer = node;
    newContext.scrollOffset = node.internal_scrollOffset ?? {x: 0, y: 0};
  }
}
```

#### 3.3 Calculate Sticky Position

When rendering a sticky element:

```typescript
const renderStickyElement = (
  node: DOMElement,
  context: RenderContext,
  normalX: number,  // position without sticky adjustment
  normalY: number,
): {x: number; y: number} => {
  if (node.style.position !== 'sticky' || !context.scrollContainer) {
    return {x: normalX, y: normalY};
  }
  
  const {scrollOffset, scrollContainer} = context;
  const containerYoga = scrollContainer.yogaNode!;
  
  // Get container bounds (inside borders)
  const containerTop = containerYoga.getComputedBorder(Yoga.EDGE_TOP);
  const containerBottom = containerYoga.getComputedHeight() - 
    containerYoga.getComputedBorder(Yoga.EDGE_BOTTOM);
  const containerLeft = containerYoga.getComputedBorder(Yoga.EDGE_LEFT);
  const containerRight = containerYoga.getComputedWidth() - 
    containerYoga.getComputedBorder(Yoga.EDGE_RIGHT);
  
  // Get sticky offsets
  const stickyTop = node.style.stickyTop ?? node.style.top;
  const stickyBottom = node.style.stickyBottom ?? node.style.bottom;
  const stickyLeft = node.style.stickyLeft ?? node.style.left;
  const stickyRight = node.style.stickyRight ?? node.style.right;
  
  // Calculate element dimensions
  const nodeYoga = node.yogaNode!;
  const nodeHeight = nodeYoga.getComputedHeight();
  const nodeWidth = nodeYoga.getComputedWidth();
  
  let finalX = normalX;
  let finalY = normalY;
  
  // Apply vertical stickiness
  if (stickyTop !== undefined) {
    // Element should not go above (containerTop + stickyTop)
    const minY = containerTop + stickyTop;
    finalY = Math.max(minY, normalY);
  }
  
  if (stickyBottom !== undefined) {
    // Element should not go below (containerBottom - stickyBottom - nodeHeight)
    const maxY = containerBottom - stickyBottom - nodeHeight;
    finalY = Math.min(maxY, finalY);
  }
  
  // Apply horizontal stickiness
  if (stickyLeft !== undefined) {
    const minX = containerLeft + stickyLeft;
    finalX = Math.max(minX, normalX);
  }
  
  if (stickyRight !== undefined) {
    const maxX = containerRight - stickyRight - nodeWidth;
    finalX = Math.min(maxX, finalX);
  }
  
  return {x: finalX, y: finalY};
};
```

#### 3.4 Render Order for Sticky Elements

Sticky elements must render AFTER regular content to appear on top:

```typescript
// Two-pass rendering for scroll containers:
// Pass 1: Render non-sticky children (apply scroll offset)
// Pass 2: Render sticky children (apply sticky positioning)

if (isScrollContainer) {
  const stickyChildren: DOMElement[] = [];
  const regularChildren: DOMElement[] = [];
  
  for (const child of node.childNodes) {
    if (child.style?.position === 'sticky') {
      stickyChildren.push(child as DOMElement);
    } else {
      regularChildren.push(child as DOMElement);
    }
  }
  
  // Render regular children first (with scroll offset)
  for (const child of regularChildren) {
    renderNodeToOutput(child, output, {
      ...context,
      offsetX: x - scrollOffset.x,
      offsetY: y - scrollOffset.y,
    });
  }
  
  // Render sticky children on top (with sticky positioning)
  for (const child of stickyChildren) {
    const normalY = y + child.yogaNode!.getComputedTop() - scrollOffset.y;
    const {y: stickyY} = renderStickyElement(child, context, x, normalY);
    
    renderNodeToOutput(child, output, {
      ...context,
      offsetX: x - scrollOffset.x,
      offsetY: stickyY,
    });
  }
}
```

### Step 4: Update Box Component Props (`src/components/Box.tsx`)

Add sticky-related props to Box:

```typescript
export type Props = Except<Styles, 'textWrap'> & {
  // ... existing props
  
  /**
   * Position type. When set to 'sticky', element sticks to scroll container edge.
   */
  readonly position?: 'absolute' | 'relative' | 'sticky';
  
  /**
   * Sticky offset from top edge (only applies when position="sticky")
   */
  readonly stickyTop?: number;
  
  /**
   * Sticky offset from bottom edge (only applies when position="sticky")
   */
  readonly stickyBottom?: number;
};
```

### Step 5: Handle Nested Sticky Elements

When sticky elements are nested:

```typescript
// Each sticky element is relative to its nearest scroll container ancestor
// Nested scroll containers each have their own sticky context

<Box overflow="scroll" height={20}>
  <Box position="sticky" top={0}>
    <Text>Outer Sticky</Text>
  </Box>
  <Box overflow="scroll" height={10}>
    <Box position="sticky" top={0}>
      <Text>Inner Sticky</Text>  {/* Sticks to inner container */}
    </Box>
    {/* ... */}
  </Box>
</Box>
```

### Step 6: Create Example (`examples/sticky/`)

```tsx
// examples/sticky/sticky.tsx
import React, {useRef, useState} from 'react';
import {render, Box, Text, useInput, type BoxRef} from '../../src/index.js';

const sections = ['Section A', 'Section B', 'Section C'];
const itemsPerSection = 10;

function StickyExample() {
  const boxRef = useRef<BoxRef>(null);
  const [scrollY, setScrollY] = useState(0);
  
  useInput((input, key) => {
    if (key.downArrow) {
      const newY = scrollY + 1;
      setScrollY(newY);
      boxRef.current?.scrollTo({y: newY});
    } else if (key.upArrow) {
      const newY = Math.max(0, scrollY - 1);
      setScrollY(newY);
      boxRef.current?.scrollTo({y: newY});
    }
  });
  
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Sticky Headers Demo (↑/↓ to scroll)</Text>
      
      <Box
        ref={boxRef}
        width={40}
        height={15}
        overflow="scroll"
        borderStyle="round"
        flexDirection="column"
      >
        {sections.map(section => (
          <Box key={section} flexDirection="column">
            {/* Sticky section header */}
            <Box position="sticky" stickyTop={0} backgroundColor="blue">
              <Text bold color="white">{section}</Text>
            </Box>
            
            {/* Section items */}
            {Array.from({length: itemsPerSection}, (_, i) => (
              <Text key={i}>{section} - Item {i + 1}</Text>
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

render(<StickyExample />);
```

### Step 7: Add Tests (`test/sticky.tsx`)

```tsx
import React, {useRef, useEffect} from 'react';
import test from 'ava';
import {Box, Text, render, type BoxRef} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import delay from 'delay';

test('sticky element stays at top when scrolled', async t => {
  const stdout = createStdout(100);
  
  function TestComponent() {
    const boxRef = useRef<BoxRef>(null);
    
    useEffect(() => {
      // Scroll down by 5
      boxRef.current?.scrollTo({y: 5});
    }, []);
    
    return (
      <Box
        ref={boxRef}
        width={20}
        height={5}
        overflow="scroll"
        flexDirection="column"
      >
        <Box position="sticky" stickyTop={0}>
          <Text>HEADER</Text>
        </Box>
        {Array.from({length: 20}, (_, i) => (
          <Text key={i}>Item {i}</Text>
        ))}
      </Box>
    );
  }
  
  render(<TestComponent />, {stdout, debug: true});
  await delay(100);
  
  const output = stdout.get();
  const lines = output.split('\n');
  
  // Header should still be visible at top
  t.true(lines[0].includes('HEADER'));
  
  // Original items 0-4 should not be visible (scrolled past)
  t.false(output.includes('Item 0'));
  t.false(output.includes('Item 1'));
  
  // Items 5+ should be visible
  t.true(output.includes('Item 5'));
});

test('sticky element follows normal flow when not scrolled', async t => {
  const stdout = createStdout(100);
  
  function TestComponent() {
    return (
      <Box
        width={20}
        height={5}
        overflow="scroll"
        flexDirection="column"
      >
        <Text>Before</Text>
        <Box position="sticky" stickyTop={0}>
          <Text>STICKY</Text>
        </Box>
        <Text>After</Text>
      </Box>
    );
  }
  
  render(<TestComponent />, {stdout, debug: true});
  await delay(50);
  
  const output = stdout.get();
  const lines = output.split('\n');
  
  // Normal flow: Before, STICKY, After
  t.true(lines[0].includes('Before'));
  t.true(lines[1].includes('STICKY'));
  t.true(lines[2].includes('After'));
});

test('multiple sticky elements stack correctly', async t => {
  const stdout = createStdout(100);
  
  function TestComponent() {
    const boxRef = useRef<BoxRef>(null);
    
    useEffect(() => {
      boxRef.current?.scrollTo({y: 10});
    }, []);
    
    return (
      <Box
        ref={boxRef}
        width={20}
        height={6}
        overflow="scroll"
        flexDirection="column"
      >
        <Box position="sticky" stickyTop={0}>
          <Text>Header 1</Text>
        </Box>
        {Array.from({length: 5}, (_, i) => (
          <Text key={`a${i}`}>A-{i}</Text>
        ))}
        <Box position="sticky" stickyTop={1}>
          <Text>Header 2</Text>
        </Box>
        {Array.from({length: 10}, (_, i) => (
          <Text key={`b${i}`}>B-{i}</Text>
        ))}
      </Box>
    );
  }
  
  render(<TestComponent />, {stdout, debug: true});
  await delay(100);
  
  const output = stdout.get();
  const lines = output.split('\n');
  
  // Both headers should be visible, stacked
  t.true(lines[0].includes('Header 1'));
  t.true(lines[1].includes('Header 2'));
});

test('sticky bottom element sticks to bottom', async t => {
  const stdout = createStdout(100);
  
  function TestComponent() {
    return (
      <Box
        width={20}
        height={5}
        overflow="scroll"
        flexDirection="column"
      >
        {Array.from({length: 10}, (_, i) => (
          <Text key={i}>Item {i}</Text>
        ))}
        <Box position="sticky" stickyBottom={0}>
          <Text>FOOTER</Text>
        </Box>
      </Box>
    );
  }
  
  render(<TestComponent />, {stdout, debug: true});
  await delay(50);
  
  const output = stdout.get();
  const lines = output.split('\n').filter(l => l.trim());
  
  // Footer should be at bottom
  t.true(lines[lines.length - 1].includes('FOOTER'));
});
```

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/styles.ts` | Modify | Add `'sticky'` to position type, add sticky offset properties |
| `src/dom.ts` | Modify | Add `internal_stickyContext` for tracking |
| `src/render-node-to-output.ts` | Modify | Core sticky logic: two-pass rendering, position calculation |
| `src/components/Box.tsx` | Modify | Add position and sticky offset props |
| `examples/sticky/index.ts` | Create | Example entry point |
| `examples/sticky/sticky.tsx` | Create | Demo with sticky section headers |
| `test/sticky.tsx` | Create | Unit tests for sticky behavior |

## Edge Cases to Handle

1. **Sticky element larger than container**: Scroll normally, don't stick
2. **Multiple sticky elements with same offset**: Stack in DOM order
3. **Sticky inside non-scroll container**: Ignore sticky, render normally
4. **Dynamic content changes**: Recalculate on re-render
5. **Horizontal + vertical sticky**: Apply both constraints

## Performance Considerations

1. **Minimize re-renders**: Only recalculate sticky positions when scroll offset changes
2. **Cache calculations**: Store computed sticky bounds per scroll container
3. **Limit sticky element count**: Many sticky elements increase render complexity

## Future Enhancements

1. **`stickyOffset` shorthand**: `stickyOffset={[top, right, bottom, left]}`
2. **Sticky events**: `onStick`, `onUnstick` callbacks
3. **Sticky groups**: Multiple elements that stick/unstick together
4. **Smooth transitions**: Animated stick/unstick (if Ink adds animation support)
