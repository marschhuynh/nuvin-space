import type React from 'react';
import { useRef, useState, useLayoutEffect, type ReactNode } from 'react';
import { Box, measureElement, type BoxRef } from 'ink';
import { VirtualizedChat, type VirtualizedChatRef } from '../VirtualizedChat/index.js';
import type { MessageLine } from '../../adapters/index.js';
import type { SessionInfo } from '../../types.js';

export type FixedLayoutProps = {
  width: number;
  height: number;
  header?: ReactNode;
  footer?: ReactNode;
  headerHeight?: number;
  footerHeight?: number;
  children: ReactNode;
};

export function FixedLayout({
  width,
  height,
  header,
  footer,
  headerHeight = 0,
  footerHeight = 0,
  children,
}: FixedLayoutProps): React.ReactElement {
  const contentHeight = height - headerHeight - footerHeight;

  return (
    <Box flexDirection="column" width={width} height={height}>
      {header && (
        <Box height={headerHeight} flexShrink={0}>
          {header}
        </Box>
      )}
      <Box height={contentHeight} flexGrow={1} flexShrink={0} overflow="hidden">
        {children}
      </Box>
      {footer && (
        <Box height={footerHeight} flexShrink={0}>
          {footer}
        </Box>
      )}
    </Box>
  );
}

export type FlexLayoutProps = {
  width: number;
  height: number;
  bottom?: ReactNode;
  chatRef?: React.RefObject<VirtualizedChatRef | null>;
  messages?: MessageLine[];
  sessions?: SessionInfo[] | null;
  headerKey?: number;
  chatFocus?: boolean;
};

export function FlexLayout({
  width,
  height,
  bottom,
  chatRef,
  messages = [],
  sessions,
  headerKey = 0,
  chatFocus = false,
}: FlexLayoutProps): React.ReactElement {
  const bottomRef = useRef<BoxRef>(null);
  const [bottomHeight, setBottomHeight] = useState(5);

  useLayoutEffect(() => {
    if (bottomRef.current) {
      const { height: measuredHeight } = measureElement(bottomRef.current);
      if (measuredHeight > 0 && measuredHeight !== bottomHeight) {
        setBottomHeight(measuredHeight);
      }
    }
  });

  const chatHeight = Math.max(1, height - bottomHeight);

  return (
    <Box flexDirection="column" width={width} height={height}>
      <VirtualizedChat
        ref={chatRef}
        messages={messages}
        height={chatHeight}
        width={width}
        sessions={sessions}
        headerKey={headerKey}
        focus={chatFocus}
      />
      {bottom && (
        <Box ref={bottomRef} flexShrink={0} flexDirection="column" overflow="hidden">
          {bottom}
        </Box>
      )}
    </Box>
  );
}
