import React, { useCallback, useMemo, useRef } from 'react';
import { Box, Static } from 'ink';
import { MessageLine } from './MessageLine.js';
import type { MessageLine as MessageLineType } from '@/adapters/index.js';
import { RecentSessions, WelcomeLogo } from './RecentSessions.js';

import type { SessionInfo } from '@/types.js';
import { getDefaultLogger } from '@/utils/file-logger.js';

type ChatDisplayProps = {
  key: string;
  messages: MessageLineType[];
  selectedIndex?: number | null;
  expandedIds?: Set<string>;
  headerKey?: number;
  sessions?: SessionInfo[] | null;
};

const logger = getDefaultLogger();

/**
 * Merges tool calls with their corresponding tool results for display purposes only.
 * Does NOT modify the original messages array in memory.
 */
function mergeToolCallsWithResults(messages: MessageLineType[]): MessageLineType[] {
  const result: MessageLineType[] = [];
  const toolResultsById = new Map<string, MessageLineType>();

  // First pass: collect all tool results by their tool call ID
  for (const msg of messages) {
    if (msg.type === 'tool_result' && msg.metadata?.toolResult?.id) {
      toolResultsById.set(msg.metadata.toolResult.id, msg);
    }
  }

  // Second pass: merge tool calls with their results
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    if (msg.type === 'tool') {
      // This is a tool call message - check if we have results for any of the calls
      const toolCalls = msg.metadata?.toolCalls || [];
      const mergedResults: MessageLineType[] = [];

      // Build a map of tool results by call ID for quick lookup
      const resultsByCallId = new Map<string, MessageLineType>();
      for (const toolCall of toolCalls) {
        const toolResult = toolResultsById.get(toolCall.id);
        if (toolResult) {
          mergedResults.push(toolResult);
          resultsByCallId.set(toolCall.id, toolResult);
        }
      }

      // Add the tool call message with enhanced metadata including results
      // Only create new object if resultsByCallId actually has entries
      if (resultsByCallId.size > 0) {
        result.push({
          ...msg,
          metadata: {
            ...msg.metadata,
            toolResultsByCallId: resultsByCallId,
          },
        });
      } else {
        // No results yet, push original message
        result.push(msg);
      }

      // Add all merged results immediately after
      result.push(...mergedResults);
    } else if (msg.type === 'tool_result') {
      // Skip standalone tool_result messages - they're already merged with their tool calls
      // Only add them if they don't have a matching tool call (orphaned results)
      const toolResultId = msg.metadata?.toolResult?.id;
      if (!toolResultId) {
        // No ID, add it as-is
        result.push(msg);
      } else {
        // Check if there's a matching tool call in our messages
        const hasMatchingToolCall = messages.some(
          (m) => m.type === 'tool' && m.metadata?.toolCalls?.some((tc) => tc.id === toolResultId),
        );

        if (!hasMatchingToolCall) {
          // Orphaned result, add it
          result.push(msg);
        }
        // Otherwise skip - it's already been merged
      }
    } else {
      // Not a tool call or result, pass through
      result.push(msg);
    }
  }

  return result;
}

/**
 * Check if a tool call message has any pending (incomplete) tool calls
 */
function hasAnyPendingToolCalls(msg: MessageLineType): boolean {
  if (msg.type !== 'tool') return false;

  const toolCalls = msg.metadata?.toolCalls || [];
  const toolResultsByCallId = msg.metadata?.toolResultsByCallId as Map<string, MessageLineType> | undefined;

  // If there are no tool calls, it's not pending
  if (toolCalls.length === 0) return false;

  // Check if any tool call doesn't have a result yet
  for (const toolCall of toolCalls) {
    const hasResult = toolResultsByCallId?.has(toolCall.id);
    if (!hasResult) {
      return true; // At least one tool call is pending
    }
  }

  return false; // All tool calls have results
}

const ChatDisplayComponent: React.FC<ChatDisplayProps> = ({ messages, headerKey, sessions: sessionsProp }) => {
  const DYNAMIC_COUNT = 0;
  // Use sessions from props instead of loading internally
  const sessions = sessionsProp ?? null;

  // Merge tool calls with results for display only
  const mergedMessages = useMemo(() => mergeToolCallsWithResults(messages), [messages]);

  // Calculate static count, excluding pending tool calls and streaming messages
  const calculateStaticCount = useCallback((msgs: MessageLineType[]) => {
    // Start from the end and work backwards
    // Keep at least DYNAMIC_COUNT messages dynamic
    let dynamicCount = DYNAMIC_COUNT;

    // Check messages from the end, looking for pending tool calls or streaming messages
    for (let i = msgs.length - 1; i >= 0; i--) {
      const msg = msgs[i];

      // If this message is actively streaming, keep it and everything after it dynamic
      if (msg.metadata?.isStreaming === true) {
        dynamicCount = msgs.length - i;
        break;
      }

      // If this message is a pending tool call, keep it and everything after it dynamic
      if (hasAnyPendingToolCalls(msg)) {
        dynamicCount = msgs.length - i;
        break;
      }

      // Stop checking once we've gone past the minimum dynamic count
      if (msgs.length - i > DYNAMIC_COUNT) {
        break;
      }
    }

    return Math.max(0, msgs.length - dynamicCount);
  }, []);

  const staticCount = useMemo(() => calculateStaticCount(mergedMessages), [mergedMessages, calculateStaticCount]);

  // Use a ref to maintain the stable list of static items to avoid re-rendering Static
  // when the prefix hasn't changed.
  const lastStaticItemsRef = React.useRef<MessageLineType[]>([]);

  const staticItems = useMemo(() => {
    const prevStatic = lastStaticItemsRef.current;
    const currentStaticSlice = mergedMessages.slice(0, staticCount);

    // Helper to update ref and return
    const update = (items: MessageLineType[]) => {
      lastStaticItemsRef.current = items;
      return items;
    };

    // 1. Initial load
    if (prevStatic.length === 0) {
      return update(currentStaticSlice);
    }

    // 2. Check for invalidation (shrinking or head change)
    // If staticCount decreased, we must have removed messages.
    if (staticCount < prevStatic.length) {
      return update(currentStaticSlice);
    }
    // If the first message ID changed, it's a different session/context.
    if (currentStaticSlice.length > 0 && prevStatic[0]?.id !== currentStaticSlice[0]?.id) {
      return update(currentStaticSlice);
    }

    // 3. Check for Append
    if (staticCount > prevStatic.length) {
      const newItems = currentStaticSlice.slice(prevStatic.length);
      return update([...prevStatic, ...newItems]);
    }

    // 4. Same length. Assume stable to prevent Static re-render.
    return prevStatic;
  }, [mergedMessages, staticCount]);

  // Track if we have shown sessions to ensure we keep them in the list
  // to preserve Static index alignment
  const showedSessionsRef = useRef(false);

  const staticItemsWithHeader = useMemo(() => {
    const hasMessages = messages.length > 0;
    const items: Array<
      { type: 'logo' | 'sessions' | MessageLineType['type']; id: string; sessions?: SessionInfo[] } | MessageLineType
    > = [];

    // Always show logo at the start
    items.push({ type: 'logo' as const, id: `logo-${headerKey}` });

    // Show sessions if:
    // 1. We have no messages (initial state)
    // 2. OR we already showed them in this component lifecycle (to preserve Static indices)
    const shouldShowSessions = (!hasMessages && sessions !== null && sessions.length > 0) || showedSessionsRef.current;

    if (shouldShowSessions && sessions !== null && sessions.length > 0) {
      items.push({ type: 'sessions' as const, id: `sessions-${headerKey}-${sessions.length}`, sessions });
      showedSessionsRef.current = true;
    }

    // Add all static messages
    items.push(...staticItems);

    return items;
  }, [headerKey, sessions, staticItems, messages.length]);

  const visible = useMemo(() => {
    return mergedMessages.slice(staticItems.length);
  }, [mergedMessages, staticItems]);

  logger.info('ChatDisplay', {
    headerKey,
    staticCount,
    staticItemsLength: staticItems.length,
    visibleLength: visible.length,
  });

  /* Render static items using Ink's Static so they don't update after being printed */
  return (
    <Box flexDirection="column" flexShrink={1} flexGrow={1} overflow="hidden">
      {staticItemsWithHeader.length > 0 && (
        <Static items={staticItemsWithHeader}>
          {(item) => {
            if (item.type === 'logo') {
              return <WelcomeLogo key={item.id} />;
            }
            if (item.type === 'sessions' && item.sessions) {
              return <RecentSessions key={item.id} recentSessions={item.sessions} />;
            }
            return <MessageLine key={item.id} message={item as MessageLineType} />;
          }}
        </Static>
      )}

      {visible.map((line) => (
        <MessageLine key={line.id} message={line} />
      ))}
    </Box>
  );
};

export const ChatDisplay = React.memo(ChatDisplayComponent);
