import React, { forwardRef, useImperativeHandle, useRef, useEffect, type ReactNode } from 'react';
import { Box, type BoxRef } from 'ink';

export type VirtualizedListRef = {
  scrollTo: (offset: number) => void;
  scrollToIndex: (index: number) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  getScrollOffset: () => number;
};

export type VirtualizedListProps<T> = {
  items: T[];
  height: number;
  itemHeight: number | ((item: T, index: number) => number);
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor?: (item: T, index: number) => string;
  overscan?: number;
  scrollOffset?: number;
  onScroll?: (offset: number) => void;
  autoScrollToBottom?: boolean;
};

function VirtualizedListInner<T>(props: VirtualizedListProps<T>, ref: React.Ref<VirtualizedListRef>) {
  const { items, height, itemHeight, renderItem, keyExtractor, autoScrollToBottom = false } = props;

  const boxRef = useRef<BoxRef>(null);
  const isAtBottomRef = useRef(true);
  const prevItemsLengthRef = useRef(items.length);
  const prevLastItemIdRef = useRef<string | null>(null);

  const lastItemId = items.length > 0 && keyExtractor ? keyExtractor(items[items.length - 1], items.length - 1) : null;

  useEffect(() => {
    const lengthIncreased = items.length > prevItemsLengthRef.current;
    const lastItemChanged = lastItemId !== prevLastItemIdRef.current;

    if (lengthIncreased || lastItemChanged) {
      isAtBottomRef.current = true;
    }
    prevItemsLengthRef.current = items.length;
    prevLastItemIdRef.current = lastItemId;
  }, [items.length, lastItemId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on items change
  useEffect(() => {
    if ((autoScrollToBottom || isAtBottomRef.current) && boxRef.current) {
      boxRef.current.scrollToBottom();
    }
  }, [items, autoScrollToBottom, lastItemId]);

  const scrollToBottom = () => {
    boxRef.current?.scrollToBottom();
    isAtBottomRef.current = true;
  };

  const scrollToTop = () => {
    boxRef.current?.scrollToTop();
    isAtBottomRef.current = false;
  };

  const scrollTo = (y: number) => {
    boxRef.current?.scrollTo({ y });
  };

  const scrollToIndex = (index: number) => {
    if (index < 0 || index >= items.length) return;

    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += typeof itemHeight === 'function' ? itemHeight(items[i], i) : itemHeight;
    }
    scrollTo(offset);
  };

  useImperativeHandle(
    ref,
    () => ({
      scrollTo,
      scrollToIndex,
      scrollToTop,
      scrollToBottom,
      getScrollOffset: () => boxRef.current?.getScrollPosition().y ?? 0,
    }),
    [items, itemHeight],
  );

  return (
    <Box ref={boxRef} height={height} flexDirection="column" overflow="scroll" alignItems="flex-end">
      {items.map((item, index) => {
        const key = keyExtractor ? keyExtractor(item, index) : index;
        return (
          <Box key={key} flexShrink={0}>
            {renderItem(item, index)}
          </Box>
        );
      })}
    </Box>
  );
}

export const VirtualizedList = forwardRef(VirtualizedListInner) as <T>(
  props: VirtualizedListProps<T> & { ref?: React.Ref<VirtualizedListRef> },
) => React.ReactElement;
