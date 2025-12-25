# Position Absolute & Z-Index Implementation Plan

## Overview

Implement `position: 'absolute'` with offset props (`top`, `left`, `right`, `bottom`) and `zIndex` for the Box component in the ink package.

## Current State

- `Styles` type already defines `position?: 'absolute' | 'relative' | 'sticky'` and `top/left/right/bottom` props
- `applyPositionStyles` only sets `POSITION_TYPE_ABSOLUTE` but does NOT apply offset values
- `zIndex` is not implemented

## Implementation Tasks

### 1. Update `applyPositionStyles` in `styles.ts`

Apply `top/left/right/bottom` offsets to Yoga node:

```ts
const applyPositionStyles = (node: YogaNode, style: Styles): void => {
  if ('position' in style) {
    node.setPositionType(
      style.position === 'absolute'
        ? Yoga.POSITION_TYPE_ABSOLUTE
        : Yoga.POSITION_TYPE_RELATIVE,
    );
  }
  if ('top' in style) {
    node.setPosition(Yoga.EDGE_TOP, style.top ?? 0);
  }
  if ('bottom' in style) {
    node.setPosition(Yoga.EDGE_BOTTOM, style.bottom ?? 0);
  }
  if ('left' in style) {
    node.setPosition(Yoga.EDGE_LEFT, style.left ?? 0);
  }
  if ('right' in style) {
    node.setPosition(Yoga.EDGE_RIGHT, style.right ?? 0);
  }
};
```

### 2. Add `zIndex` to `Styles` type in `styles.ts`

```ts
export type Styles = {
  // ... existing props

  /**
   * Controls the stacking order of positioned elements.
   * Higher values are rendered on top of lower values.
   * Only affects elements with position: 'absolute' or 'relative'.
   *
   * @default 0
   */
  readonly zIndex?: number;
};
```

### 3. Update `render-node-to-output.ts` - Sort children by zIndex

Before iterating `childNodes`, sort by `zIndex` to ensure correct rendering order:

```ts
// In the rendering loop where childNodes are processed:
const sortedChildren = [...node.childNodes].sort((a, b) => {
  const aZ = (a as DOMElement).style?.zIndex ?? 0;
  const bZ = (b as DOMElement).style?.zIndex ?? 0;
  return aZ - bZ;
});

for (const childNode of sortedChildren) {
  // ... existing rendering logic
}
```

### 4. Create Demo File `packages/nuvin-cli/source/position-demo.tsx`

#### Demo Visual Preview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Position Absolute & Z-Index Demo                    Position: (5, 3) | Box 3 │
│ Arrow keys to move, Tab to select box, q to quit                             │
├──────────────────────────────────────────────────────────────────────────────┤
│ · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·  · · │
│ · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·· · · │
│ · · · · ╭──────────────────╮· · · · · · · · · · · · · · · · · · · · ·  · · · │
│ · · · · │ Box 1 (z: 1)     │· · · · · · · · · · · · · · · · · · · · ·· · · · │
│ · · · · │                  ╭──────────────────╮ · · · · · · · · · ·  · · · · │
│ · · · · │                  │ Box 2 (z: 2)     │ · · · · · · · · · ·· · · · · │
│ · · · · └──────────────────│                  │ · · · · · · · · ·  · · · · · │
│ · · · · · · · · · · · · · ·│                  │ · · · · · · · · ·· · · · · · │
│ · · · · · · · · · · · · · ·└──────────────────╯ · · · · · · · ·  · · · · · · │
│ · · ╔═══════════════════════╗ · · · · · · · · · · · · · · · · ·· · · · · · · │
│ · · ║ Box 3 (z: 3) - Movable║ · · · · · · · · · · · · · · · ·  · · · · · · · │
│ · · ║ Use arrows to move    ║ · · · · · · · · · · · · · · · ·· · · · · · · · │
│ · · ║                       ║ · · · · · · · · · · · · ·  ┌─────────────────┐ │
│ · · ╚═══════════════════════╝ · · · · · · · · · · · ·  · │ Tooltip (z: 10) │ │
│ · · · · · · · · · · · · · · · · · · · · · · · · · · ·· · └─────────────────┘ │
├──────────────────────────────────────────────────────────────────────────────┤
│ z-Index Demo: Box 1 (z:1) → Box 2 (z:2) → Box 3 (z:3) → Tooltip (z:10)       │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Overlapping Demo (showing z-index in action)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·· │
│ · · · · ╭──────────────────╮· · · · · · · · · · · · · · · · · · · · · · ·  · │
│ · · · · │ Box 1 (z: 1)     │· · · · · · · · · · · · · · · · · · · · · · ·· · │
│ · · · · │            ╭──────────────────╮· · · · · · · · · · · · · · · · · · │
│ · · · · │            │ Box 2 (z: 2)     │· · · · · · · · · · · · · · · · · · │
│ · · · · └────────────│           ╔═══════════════════════╗ · · · · · · · · · │
│ · · · · · · · · · · ·│           ║ Box 3 (z: 3) - Movable║ · · · · · · · · · │
│ · · · · · · · · · · ·└───────────║ Use arrows to move    ║ · · · · · · · · · │
│ · · · · · · · · · · · · · · · · ·║                       ║ · · · · · · · · · │
│ · · · · · · · · · · · · · · · · ·╚═══════════════════════╝ · · · · · · · · · │
└──────────────────────────────────────────────────────────────────────────────┘

    Box 3 (z:3) renders ON TOP of Box 2 (z:2) which renders ON TOP of Box 1 (z:1)
```

#### Code

```tsx
import { useRef, useState, useEffect } from 'react';
import { Box, render, useInput, Text, useStdout, type Key } from 'ink';

function PositionDemo() {
  const [position, setPosition] = useState({ x: 5, y: 3 });
  const [selectedBox, setSelectedBox] = useState(0);
  const [terminalSize, setTerminalSize] = useState({
    width: process.stdout.columns || 80,
    height: process.stdout.rows || 24,
  });

  useEffect(() => {
    const handleResize = () => {
      setTerminalSize({
        width: process.stdout.columns || 80,
        height: process.stdout.rows || 24,
      });
    };
    process.stdout.on('resize', handleResize);
    return () => {
      process.stdout.off('resize', handleResize);
    };
  }, []);

  useInput((input: string, key: Key) => {
    if (input === 'q') {
      process.exit(0);
    } else if (key.downArrow) {
      setPosition((p) => ({ ...p, y: Math.min(p.y + 1, terminalSize.height - 10) }));
    } else if (key.upArrow) {
      setPosition((p) => ({ ...p, y: Math.max(p.y - 1, 0) }));
    } else if (key.leftArrow) {
      setPosition((p) => ({ ...p, x: Math.max(p.x - 1, 0) }));
    } else if (key.rightArrow) {
      setPosition((p) => ({ ...p, x: Math.min(p.x + 1, terminalSize.width - 20) }));
    } else if (input === 'tab' || input === '\t') {
      setSelectedBox((s) => (s + 1) % 3);
    }
  });

  return (
    <Box
      flexDirection="column"
      width={terminalSize.width}
      height={terminalSize.height}
    >
      {/* Header */}
      <Box paddingX={1} justifyContent="space-between">
        <Text bold>Position Absolute & Z-Index Demo</Text>
        <Text dimColor>
          Position: ({position.x}, {position.y}) | Selected: Box {selectedBox + 1}
        </Text>
      </Box>
      <Box paddingX={1}>
        <Text dimColor>
          Arrow keys to move, Tab to select box, q to quit
        </Text>
      </Box>

      {/* Main content area with relative positioning */}
      <Box flexGrow={1} position="relative">
        {/* Background grid pattern */}
        <Box
          position="absolute"
          top={0}
          left={0}
          width="100%"
          height="100%"
        >
          <Text dimColor>
            {'· '.repeat(Math.floor(terminalSize.width / 2) * (terminalSize.height - 4)).slice(0, -1)}
          </Text>
        </Box>

        {/* Box 1 - Red, zIndex: 1 */}
        <Box
          position="absolute"
          top={2}
          left={10}
          width={20}
          height={6}
          backgroundColor={selectedBox === 0 ? 'red' : 'gray'}
          borderStyle="round"
          zIndex={1}
        >
          <Box padding={1}>
            <Text color="white" bold>
              Box 1 (z: 1)
            </Text>
          </Box>
        </Box>

        {/* Box 2 - Green, zIndex: 2 */}
        <Box
          position="absolute"
          top={4}
          left={20}
          width={20}
          height={6}
          backgroundColor={selectedBox === 1 ? 'green' : 'gray'}
          borderStyle="round"
          zIndex={2}
        >
          <Box padding={1}>
            <Text color="white" bold>
              Box 2 (z: 2)
            </Text>
          </Box>
        </Box>

        {/* Box 3 - Movable, Blue, zIndex: 3 */}
        <Box
          position="absolute"
          top={position.y}
          left={position.x}
          width={25}
          height={7}
          backgroundColor={selectedBox === 2 ? 'blue' : 'gray'}
          borderStyle="double"
          zIndex={3}
        >
          <Box padding={1} flexDirection="column">
            <Text color="white" bold>
              Box 3 (z: 3) - Movable
            </Text>
            <Text color="white">
              Use arrows to move
            </Text>
          </Box>
        </Box>

        {/* Tooltip/Overlay example */}
        <Box
          position="absolute"
          bottom={1}
          right={2}
          backgroundColor="yellow"
          paddingX={2}
          paddingY={1}
          borderStyle="single"
          zIndex={10}
        >
          <Text color="black">Tooltip (z: 10)</Text>
        </Box>
      </Box>

      {/* Footer */}
      <Box paddingX={1} borderStyle="single" borderTop borderBottom={false} borderLeft={false} borderRight={false}>
        <Text>
          <Text bold>z-Index Demo: </Text>
          <Text color="red">Box 1 (z:1)</Text>
          <Text> → </Text>
          <Text color="green">Box 2 (z:2)</Text>
          <Text> → </Text>
          <Text color="blue">Box 3 (z:3)</Text>
          <Text> → </Text>
          <Text color="yellow">Tooltip (z:10)</Text>
        </Text>
      </Box>
    </Box>
  );
}

render(<PositionDemo />);
```

### 5. Add Tests in `packages/ink/test/position.tsx`

```tsx
import React from 'react';
import test from 'ava';
import { render } from '../src/index.js';
import { Box, Text } from '../src/index.js';
import { renderToString } from './helpers/render-to-string.js';

test('position absolute with top/left offsets', (t) => {
  const output = renderToString(
    <Box width={20} height={10}>
      <Box position="absolute" top={2} left={5}>
        <Text>Hello</Text>
      </Box>
    </Box>
  );

  // Verify text appears at correct position
  const lines = output.split('\n');
  t.true(lines[2]?.includes('Hello'));
});

test('zIndex - higher zIndex renders on top', (t) => {
  const output = renderToString(
    <Box width={20} height={5}>
      <Box position="absolute" top={0} left={0} zIndex={1}>
        <Text>AAA</Text>
      </Box>
      <Box position="absolute" top={0} left={1} zIndex={2}>
        <Text>BBB</Text>
      </Box>
    </Box>
  );

  // BBB should overwrite part of AAA since it has higher zIndex
  t.true(output.includes('ABBB'));
});

test('zIndex - default zIndex is 0', (t) => {
  const output = renderToString(
    <Box width={20} height={5}>
      <Box position="absolute" top={0} left={0}>
        <Text>First</Text>
      </Box>
      <Box position="absolute" top={0} left={0} zIndex={1}>
        <Text>Second</Text>
      </Box>
    </Box>
  );

  // Second should render on top
  t.true(output.includes('Second'));
  t.false(output.includes('First'));
});
```

## File Changes Summary

| File | Change |
|------|--------|
| `packages/ink/src/styles.ts` | Add `zIndex` to Styles type, update `applyPositionStyles` |
| `packages/ink/src/render-node-to-output.ts` | Sort children by zIndex before rendering |
| `packages/nuvin-cli/source/position-demo.tsx` | New demo file |
| `packages/ink/test/position.tsx` | New test file |

## Testing

1. Run existing ink tests to ensure no regression
2. Run new position tests
3. Manual testing with demo: `npx tsx packages/nuvin-cli/source/position-demo.tsx`

## Notes

- `zIndex` only affects rendering order, not Yoga layout (Yoga doesn't have zIndex)
- Elements with same `zIndex` render in DOM order (later elements on top)
- `position: 'sticky'` already exists and works differently (handled in scroll context)
