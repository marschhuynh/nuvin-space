import { type BoxRef, Box, type BoxProps, measureElement, Text } from 'ink';
import { useRef, useEffect, useCallback, useState, type ReactNode } from 'react';
import { useMouse, useInput, useFocus, type MouseEvent, type Key } from '../contexts/InputContext/index.js';
import { useTheme } from '@/contexts/ThemeContext.js';

type AutoScrollBoxProps = {
  maxHeight: number | string | undefined;
  children: ReactNode;
  scrollStep?: number;
  enableMouseScroll?: boolean;
  showScrollbar?: boolean;
  scrollbarColor?: string;
  scrollbarTrackColor?: string;
  mousePriority?: number;
  enableKeyboardScroll?: boolean;
} & Omit<BoxProps, 'ref' | 'overflow' | 'height'>;

type ScrollInfo = {
  scrollY: number;
  containerHeight: number;
  contentHeight: number;
};

function Scrollbar({
  scrollInfo,
  color = 'gray',
  trackColor = 'dim',
}: {
  scrollInfo: ScrollInfo;
  color?: string;
  trackColor?: string;
}) {
  const { scrollY, containerHeight, contentHeight } = scrollInfo;

  if (contentHeight <= containerHeight) {
    return null;
  }

  const trackHeight = containerHeight;
  const thumbHeight = Math.max(1, Math.round((containerHeight / contentHeight) * trackHeight));
  const maxScrollY = contentHeight - containerHeight;
  const scrollRatio = maxScrollY > 0 ? scrollY / maxScrollY : 0;
  const thumbPosition = Math.round(scrollRatio * (trackHeight - thumbHeight));

  const track: string[] = [];
  for (let i = 0; i < trackHeight; i++) {
    if (i >= thumbPosition && i < thumbPosition + thumbHeight) {
      track.push('┃');
    } else {
      track.push('│');
    }
  }

  return (
    <Box flexDirection="column" flexShrink={0}>
      {track.map((char, i) => (
        <Text key={i} color={char === '┃' ? color : trackColor}>
          {char}
        </Text>
      ))}
    </Box>
  );
}

export function AutoScrollBox({
  maxHeight,
  children,
  scrollStep = 1,
  enableMouseScroll = true,
  showScrollbar = true,
  scrollbarColor = 'cyan',
  scrollbarTrackColor = 'gray',
  mousePriority = 0,
  enableKeyboardScroll = true,
  ...boxProps
}: AutoScrollBoxProps) {
  const { theme } = useTheme();
  const boxRef = useRef<BoxRef>(null);
  const contentRef = useRef<BoxRef>(null);
  const prevChildrenRef = useRef(children);
  const isUserScrolledRef = useRef(false);
  const [scrollInfo, setScrollInfo] = useState<ScrollInfo>({
    scrollY: 0,
    containerHeight: 0,
    contentHeight: 0,
  });

  const needsScrollbar = showScrollbar && scrollInfo.contentHeight > scrollInfo.containerHeight;
  const { isFocused } = useFocus({ active: needsScrollbar });

  const updateScrollInfo = useCallback(() => {
    if (!boxRef.current || !contentRef.current) return;
    const pos = boxRef.current.getScrollPosition();
    const containerDim = measureElement(boxRef.current);
    const contentDim = measureElement(contentRef.current);
    setScrollInfo({
      scrollY: pos?.y ?? 0,
      containerHeight: containerDim.height,
      contentHeight: contentDim.height,
    });
  }, []);

  const scrollBy = useCallback(
    (delta: number) => {
      if (!boxRef.current || !contentRef.current) return;
      const currentPos = boxRef.current.getScrollPosition();
      if (!currentPos) return;
      const newY = Math.max(0, currentPos.y + delta);
      boxRef.current.scrollTo({ x: 0, y: newY });
      const actualPos = boxRef.current.getScrollPosition();
      if (actualPos) {
        const containerDim = measureElement(boxRef.current);
        const contentDim = measureElement(contentRef.current);
        const maxScrollY = contentDim.height - containerDim.height;
        const isAtBottom = actualPos.y >= maxScrollY - 1;
        if (isAtBottom) {
          isUserScrolledRef.current = false;
        } else if (actualPos.y > 0) {
          isUserScrolledRef.current = true;
        }
      }
      updateScrollInfo();
    },
    [updateScrollInfo],
  );

  const handleMouseEvent = useCallback(
    (event: MouseEvent) => {
      // if (event.type === 'click') {
      //   focus();
      //   return true;
      // }

      const multiplier = event.count || 1;
      if (event.type === 'wheel-up') {
        scrollBy(-scrollStep * multiplier);
        return true;
      }
      if (event.type === 'wheel-down') {
        scrollBy(scrollStep * multiplier);
        return true;
      }
    },
    [scrollBy, scrollStep],
  );

  const handleKeyboardEvent = useCallback(
    (input: string, _key: Key) => {
      if (!isFocused || !needsScrollbar || !enableKeyboardScroll) {
        if (isFocused && (input === 'j' || input === 'k' || input === 'g' || input === 'G')) {
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
        if (!boxRef.current || !contentRef.current) return;
        boxRef.current.scrollTo({ x: 0, y: 0 });
        isUserScrolledRef.current = true;
        updateScrollInfo();
        return true;
      }
      if (input === 'G') {
        boxRef.current?.scrollToBottom();
        isUserScrolledRef.current = false;
        updateScrollInfo();
        return true;
      }
    },
    [isFocused, scrollBy, scrollStep, needsScrollbar, updateScrollInfo, enableKeyboardScroll],
  );

  useMouse(handleMouseEvent, { isActive: enableMouseScroll && needsScrollbar, priority: mousePriority });
  useInput(handleKeyboardEvent, { isActive: needsScrollbar, priority: mousePriority });

  useEffect(() => {
    if (prevChildrenRef.current !== children) {
      if (!isUserScrolledRef.current) {
        boxRef.current?.scrollToBottom();
      }
      prevChildrenRef.current = children;
    }
    updateScrollInfo();
  }, [children, updateScrollInfo]);

  return (
    <Box
      flexDirection="row"
      {...(maxHeight !== undefined ? { maxHeight } : {})}
      overflow="hidden"
      // borderStyle={isFocused ? 'round' : undefined}
      // borderColor={isFocused ? 'cyan' : undefined}
      backgroundColor={isFocused ? theme.tokens.dim : 'transparent'}
    >
      <Box ref={boxRef} overflow="scroll" flexGrow={1} {...boxProps} flexDirection="column">
        <Box ref={contentRef} flexShrink={0} flexDirection="column">
          {children}
        </Box>
      </Box>
      {needsScrollbar && <Scrollbar scrollInfo={scrollInfo} color={scrollbarColor} trackColor={scrollbarTrackColor} />}
    </Box>
  );
}
