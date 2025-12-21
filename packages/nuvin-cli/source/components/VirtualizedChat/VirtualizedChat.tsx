import { useRef, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useInput } from 'ink';
import type { MessageLine as MessageLineType } from '../../adapters/index.js';
import { MessageLine } from '../MessageLine.js';
import { WelcomeLogo } from '../RecentSessions.js';
import { VirtualizedList, type VirtualizedListRef } from '../VirtualizedList/index.js';
import { estimateMessageHeight } from '../../utils/messageHeight.js';
import type { SessionInfo } from '../../types.js';
import { type MergeCache, mergeToolCallsWithResultsCached } from '../ChatDisplay.js';

type ChatItem =
  | { type: 'welcome'; id: string; sessions: SessionInfo[] }
  | { type: 'message'; id: string; message: MessageLineType };

type VirtualizedChatProps = {
  messages: MessageLineType[];
  height: number;
  width: number;
  sessions?: SessionInfo[] | null;
  headerKey?: number;
  focus?: boolean;
};

export type VirtualizedChatRef = {
  scrollToBottom: () => void;
  scrollToTop: () => void;
  scrollBy: (delta: number) => void;
};

const WELCOME_HEIGHT = 8;
const SCROLL_STEP = 1;
const PAGE_SCROLL_STEP = 10;

function VirtualizedChatInner(
  { messages, height, width, sessions, headerKey = 0, focus = false }: VirtualizedChatProps,
  ref: React.Ref<VirtualizedChatRef>,
) {
  const listRef = useRef<VirtualizedListRef>(null);
  const pendingScrollDelta = useRef(0);
  const scrollRAF = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushScroll = useCallback(() => {
    if (pendingScrollDelta.current !== 0 && listRef.current) {
      const current = listRef.current.getScrollOffset();
      listRef.current.scrollTo(Math.max(0, current + pendingScrollDelta.current));
      pendingScrollDelta.current = 0;
    }
    scrollRAF.current = null;
  }, []);

  const scheduleScroll = useCallback(
    (delta: number) => {
      pendingScrollDelta.current += delta;
      if (!scrollRAF.current) {
        scrollRAF.current = setTimeout(flushScroll, 0);
      }
    },
    [flushScroll],
  );

  const mergeCacheRef = useRef<MergeCache>(new Map());
  const mergedMessages = useMemo(() => mergeToolCallsWithResultsCached(messages, mergeCacheRef.current), [messages]);

  const items = useMemo<ChatItem[]>(() => {
    const result: ChatItem[] = [];

    result.push({
      type: 'welcome',
      id: `welcome-${headerKey}`,
      sessions: sessions ?? [],
    });

    for (const msg of mergedMessages) {
      result.push({
        type: 'message',
        id: msg.id,
        message: msg,
      });
    }

    return result;
  }, [mergedMessages, sessions, headerKey]);

  const getItemHeight = useCallback(
    (item: ChatItem): number => {
      if (item.type === 'welcome') {
        return WELCOME_HEIGHT;
      }
      return estimateMessageHeight(item.message, width);
    },
    [width],
  );

  useEffect(() => {
    if (items.length <= 1) {
      listRef.current?.scrollToTop();
    }
  }, [items.length]);

  useInput(
    (input, key) => {
      if (!listRef.current) return;

      if (key.upArrow || input === 'k') {
        scheduleScroll(-SCROLL_STEP);
      } else if (key.downArrow || input === 'j') {
        scheduleScroll(SCROLL_STEP);
      } else if (key.pageUp || (key.ctrl && input === 'u')) {
        scheduleScroll(-PAGE_SCROLL_STEP);
      } else if (key.pageDown || (key.ctrl && input === 'd')) {
        scheduleScroll(PAGE_SCROLL_STEP);
      } else if (input === 'g') {
        listRef.current.scrollToTop();
      } else if (input === 'G') {
        listRef.current.scrollToBottom();
      }
    },
    { isActive: focus },
  );

  useImperativeHandle(
    ref,
    () => ({
      scrollToBottom: () => listRef.current?.scrollToBottom(),
      scrollToTop: () => listRef.current?.scrollToTop(),
      scrollBy: (delta: number) => {
        const current = listRef.current?.getScrollOffset() ?? 0;
        listRef.current?.scrollTo(Math.max(0, current + delta));
      },
    }),
    [],
  );

  const renderItem = useCallback((item: ChatItem) => {
    if (item.type === 'welcome') {
      return <WelcomeLogo recentSessions={item.sessions} />;
    }
    return <MessageLine key={item.id} message={item.message} />;
  }, []);

  const keyExtractor = useCallback((item: ChatItem) => item.id, []);

  if (height <= 0) {
    return null;
  }

  return (
    <VirtualizedList<ChatItem>
      ref={listRef}
      items={items}
      height={height}
      itemHeight={getItemHeight}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      autoScrollToBottom={!focus}
    />
  );
}

export const VirtualizedChat = forwardRef(VirtualizedChatInner);
