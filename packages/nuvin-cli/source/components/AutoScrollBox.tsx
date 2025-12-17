import { type BoxRef, Box, type BoxProps } from 'ink';
import { useRef, useEffect, type ReactNode } from 'react';

type AutoScrollBoxProps = {
  maxHeight: number | undefined;
  children: ReactNode;
} & Omit<BoxProps, 'ref' | 'overflow' | 'height'>;

export function AutoScrollBox({ maxHeight, children, ...boxProps }: AutoScrollBoxProps) {
  const boxRef = useRef<BoxRef>(null);
  const prevChildrenRef = useRef(children);

  useEffect(() => {
    if (prevChildrenRef.current !== children) {
      boxRef.current?.scrollToBottom();
      prevChildrenRef.current = children;
    }
  }, [children]);

  return (
    <Box
      ref={boxRef}
      overflow="scroll"
      flexDirection="column"
      {...(maxHeight !== undefined ? { maxHeight } : {})}
      {...boxProps}
    >
      <Box flexShrink={0}>{children}</Box>
    </Box>
  );
}
