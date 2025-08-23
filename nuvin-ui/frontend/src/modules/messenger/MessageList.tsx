import { useRef, useEffect, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Message as MessageType } from '@/types';
import { Message } from './Message';
import { LoadingMessage } from './components/LoadingMessage';
import { EmptyConversation } from './components/EmptyConversation';

interface MessageListProps {
  messages: MessageType[];
  isLoading?: boolean;
  streamingMessageId?: string | null;
  useVirtualizer?: boolean;
}

export function MessageList({
  messages,
  isLoading = false,
  streamingMessageId,
  useVirtualizer: enableVirtualizer = true,
}: MessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    enabled: enableVirtualizer,
    useAnimationFrameWithResizeObserver: true,
    count: messages.length + (isLoading ? 1 : 0),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
    overscan: 4,
    measureElement: (element) => {
      return element?.getBoundingClientRect().height ?? 200;
    },
  });

  const scrollToBottom = useCallback(() => {
    if (parentRef.current) {
      parentRef.current.scrollTop = parentRef.current.scrollHeight;
    }
  }, []);

  // Scroll to bottom when component mounts (opening conversation)
  useEffect(() => {
    setTimeout(() => {
      scrollToBottom();
    }, 300);
  }, [scrollToBottom]);

  const renderMessages = () => {
    if (messages.length === 0 && !isLoading) {
      return <EmptyConversation />;
    }

    if (!enableVirtualizer) {
      return (
        <div className="space-y-6">
          {messages.map((message) => (
            <Message
              key={message.id}
              id={message.id}
              role={message.role}
              content={message.content}
              timestamp={message.timestamp}
              isStreaming={streamingMessageId === message.id}
              metadata={message.metadata}
            />
          ))}
          {isLoading && <LoadingMessage />}
        </div>
      );
    }

    return (
      <div
        style={{
          height: virtualizer.getTotalSize(),
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const isLoadingItem = virtualItem.index >= messages.length;
          const message = messages[virtualItem.index];

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div className="pb-6">
                {isLoadingItem ? (
                  <LoadingMessage />
                ) : (
                  <Message
                    id={message.id}
                    role={message.role}
                    content={message.content}
                    timestamp={message.timestamp}
                    isStreaming={streamingMessageId === message.id}
                    metadata={message.metadata}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div ref={parentRef} className="flex-1 overflow-auto p-6 bg-message-list-background">
      <div className="max-w-4xl mx-auto">
        {renderMessages()}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
