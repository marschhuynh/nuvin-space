import { useRef, useState, useEffect } from 'react';
import { Box, render, Text, useInput, useApp } from 'ink';
import ansiEscapes from 'ansi-escapes';
import { ScrollBox, ScrollBoxProvider, type ScrollBoxHandle } from './components/ScrollBox.js';

console.log(ansiEscapes.clearTerminal);

const longContent = Array.from(
  { length: 50 },
  (_, i) => `Line ${i + 1}: This is some content that demonstrates the scrollable box functionality.`,
);

function ScrollBoxDemo() {
  const { exit } = useApp();
  const scrollBoxRef1 = useRef<ScrollBoxHandle>(null);
  const scrollBoxRef2 = useRef<ScrollBoxHandle>(null);
  const [focusedBox, setFocusedBox] = useState<number | null>(1);
  const [bounds1, setBounds1] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [bounds2, setBounds2] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    scrollBoxRef1.current?.focus();
    const interval = setInterval(() => {
      setBounds1(scrollBoxRef1.current?.getBounds() ?? null);
      setBounds2(scrollBoxRef2.current?.getBounds() ?? null);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  useInput((input, key) => {
    if (input === 'q') {
      exit();
    } else if (input === '1') {
      scrollBoxRef1.current?.focus();
      scrollBoxRef2.current?.blur();
      setFocusedBox(1);
    } else if (input === '2') {
      scrollBoxRef2.current?.focus();
      scrollBoxRef1.current?.blur();
      setFocusedBox(2);
    } else if (key.tab) {
      if (focusedBox === 1) {
        scrollBoxRef1.current?.blur();
        scrollBoxRef2.current?.focus();
        setFocusedBox(2);
      } else {
        scrollBoxRef2.current?.blur();
        scrollBoxRef1.current?.focus();
        setFocusedBox(1);
      }
    }
  });

  return (
    <ScrollBoxProvider onMouseMove={(x, y) => setMousePos({ x, y })} renderFromTop>
      <Box flexDirection="column" padding={1}>
        <Text bold>ScrollBox Demo</Text>
        <Text dimColor>Press 1/2 or Tab to switch focus, click to focus, mouse wheel to scroll, q to quit</Text>
        <Text dimColor>Focused box: {focusedBox ?? 'none'}</Text>
        <Text dimColor>
          Mouse: {mousePos ? `(${mousePos.x}, ${mousePos.y})` : 'n/a'}
          {mousePos &&
            bounds1 &&
            ` | InBox1: ${mousePos.x >= bounds1.x + 1 && mousePos.x <= bounds1.x + bounds1.width && mousePos.y >= bounds1.y + 1 && mousePos.y <= bounds1.y + bounds1.height}`}
        </Text>
        <Text dimColor>
          Box1 bounds: {bounds1 ? `x=${bounds1.x} y=${bounds1.y} w=${bounds1.width} h=${bounds1.height}` : 'n/a'}
        </Text>
        <Text dimColor>
          Box2 bounds: {bounds2 ? `x=${bounds2.x} y=${bounds2.y} w=${bounds2.width} h=${bounds2.height}` : 'n/a'}
        </Text>

        <Box marginTop={1} gap={2}>
          <Box flexDirection="column">
            <Text>Box 1:</Text>
            <ScrollBox
              ref={scrollBoxRef1}
              maxHeight={15}
              width={40}
              borderStyle="round"
              borderColor="gray"
              focusBorderColor="green"
              onFocus={() => setFocusedBox(1)}
              onBlur={() => setFocusedBox((prev) => (prev === 1 ? null : prev))}
            >
              {longContent.map((line, i) => (
                <Text key={i}>{line}</Text>
              ))}
            </ScrollBox>
          </Box>

          <Box flexDirection="column">
            <Text>Box 2:</Text>
            <ScrollBox
              ref={scrollBoxRef2}
              maxHeight={15}
              width={40}
              borderStyle="round"
              borderColor="gray"
              focusBorderColor="blue"
              onFocus={() => setFocusedBox(2)}
              onBlur={() => setFocusedBox((prev) => (prev === 2 ? null : prev))}
            >
              {longContent.map((line, i) => (
                <Text key={i} color="yellow">
                  {line}
                </Text>
              ))}
            </ScrollBox>
          </Box>
        </Box>
      </Box>
    </ScrollBoxProvider>
  );
}

render(<ScrollBoxDemo />);
