import type React from 'react';
import { useRef, useState, useLayoutEffect, useMemo, type ReactNode } from 'react';
import { Box, measureElement, type BoxRef } from 'ink';
import { MessageLine } from '../MessageLine.js';
import { WelcomeLogo } from '../RecentSessions.js';
import { mergeToolCallsWithResultsCached, type MergeCache } from '../ChatDisplay.js';
import type { MessageLine as MessageLineType } from '../../adapters/index.js';
import type { SessionInfo } from '../../types.js';
import { AutoScrollBox } from '../AutoScrollBox.js';

export type FlexLayoutProps = {
  width: number;
  height: number;
  bottom?: ReactNode;
  chatRef?: React.RefObject<unknown>;
  messages?: MessageLineType[];
  sessions?: SessionInfo[] | null;
  headerKey?: number;
  chatFocus?: boolean;
};

export function FlexLayout({
  width,
  height,
  bottom,
  messages = [],
  sessions,
  headerKey = 0,
}: FlexLayoutProps): React.ReactElement {
  const bottomRef = useRef<BoxRef>(null);
  const [bottomHeight, setBottomHeight] = useState<number | null>(null);

  const mergeCacheRef = useRef<MergeCache>(new Map());
  const mergedMessages = useMemo(() => mergeToolCallsWithResultsCached(messages, mergeCacheRef.current), [messages]);

  useLayoutEffect(() => {
    if (bottomRef.current) {
      const { height: measuredHeight } = measureElement(bottomRef.current);
      if (measuredHeight > 0 && measuredHeight !== bottomHeight) {
        setBottomHeight(measuredHeight);
      }
    }
  });

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box flexDirection="column" flexGrow={1} flexShrink={1} overflow="hidden">
        <AutoScrollBox maxHeight={height! - bottomHeight!}>
          <Box flexDirection="column">
            <WelcomeLogo key={`welcome-${headerKey}`} recentSessions={sessions ?? []} />
            {mergedMessages.map((message: MessageLineType) => (
              <MessageLine key={message.id} message={message} />
            ))}
          </Box>
        </AutoScrollBox>
      </Box>
      {bottom && (
        <Box ref={bottomRef} flexDirection="column" flexShrink={0}>
          {bottom}
        </Box>
      )}
    </Box>
  );
}
