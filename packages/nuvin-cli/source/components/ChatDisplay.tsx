import React, { useMemo, useRef } from 'react';
import { Box, Static } from 'ink';
import { MessageLine } from './MessageLine.js';
import type { MessageLine as MessageLineType } from '@/adapters/index.js';
import { WelcomeLogo } from './RecentSessions.js';
import type { SessionInfo } from '@/types.js';
import { calculateStaticCount } from '@/utils/staticCount.js';

type ChatDisplayProps = {
  key: string;
  messages: MessageLineType[];
  selectedIndex?: number | null;
  expandedIds?: Set<string>;
  headerKey?: number;
  sessions?: SessionInfo[] | null;
};

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

const ChatDisplayComponent: React.FC<ChatDisplayProps> = ({ messages, headerKey, sessions: sessionsProp }) => {
  const sessions = sessionsProp ?? null;

  const mergedMessages = useMemo(() => mergeToolCallsWithResults(messages), [messages]);

  const staticCount = useMemo(() => calculateStaticCount(mergedMessages), [mergedMessages]);

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

  // Stable refs for header items to prevent Static from re-rendering them
  type HeaderItem = { type: 'logo'; id: string; sessions: SessionInfo[] };
  const logoItemRef = useRef<HeaderItem | null>(null);
  const lastStaticItemsWithHeaderRef = useRef<Array<HeaderItem | MessageLineType>>([]);

  const staticItemsWithHeader = useMemo(() => {
    // Create or reuse stable logo item (only recreate when headerKey changes)
    const logoId = `logo-${headerKey}`;
    if (!logoItemRef.current || logoItemRef.current.id !== logoId) {
      logoItemRef.current = { type: 'logo' as const, id: logoId, sessions: sessions ?? [] };
    }

    // Build items array using stable references
    const items: Array<HeaderItem | MessageLineType> = [];
    items.push(logoItemRef.current);
    items.push(...staticItems);

    // Only return new array if content actually changed
    const prev = lastStaticItemsWithHeaderRef.current;
    if (prev.length === items.length && prev.every((item, i) => item === items[i])) {
      return prev;
    }

    lastStaticItemsWithHeaderRef.current = items;
    return items;
  }, [headerKey, sessions, staticItems]);

  const visible = useMemo(() => {
    return mergedMessages.slice(staticItems.length);
  }, [mergedMessages, staticItems]);

  /* Render static items using Ink's Static so they don't update after being printed */
  return (
    <Box flexDirection="column" flexShrink={1} flexGrow={1} overflow="hidden">
      {staticItemsWithHeader.length > 0 && (
        <Static items={staticItemsWithHeader}>
          {(item) => {
            if (item.type === 'logo') {
              return <WelcomeLogo key={item.id} recentSessions={item.sessions} />;
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
