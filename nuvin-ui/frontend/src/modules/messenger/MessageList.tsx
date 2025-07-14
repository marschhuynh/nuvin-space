import { useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Message as MessageType } from '@/types';
import { Message } from './Message';

interface MessageListProps {
  messages: MessageType[];
  isLoading?: boolean;
}

export function MessageList({ messages, isLoading = false }: MessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: messages.length + (isLoading ? 1 : 0),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
    overscan: 5,
    measureElement: (element) => {
      return element?.getBoundingClientRect().height ?? 200;
    },
  });

  const scrollToBottom = () => {
    if (parentRef.current) {
      parentRef.current.scrollTop = parentRef.current.scrollHeight;
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => {
      scrollToBottom();
    }, 100);
  }, [messages]);

  // Scroll to bottom when component mounts (opening conversation)
  useEffect(() => {
    setTimeout(() => {
      scrollToBottom();
    }, 300);
  }, []);

  return (
    <div 
      ref={parentRef}
      className="flex-1 overflow-auto p-6 bg-message-list-background"
    >
      <div className="max-w-4xl mx-auto">
        {messages.length === 0 && !isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <p className="text-lg mb-2">Welcome to Nuvin Space</p>
              <p className="text-sm">
                Start a conversation by typing a message below.
              </p>
            </div>
          </div>
        ) : (
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
                      <div className="flex justify-start">
                        <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
                          <div className="h-4 w-4 bg-primary-foreground rounded-full animate-pulse" />
                        </div>
                        <div className="max-w-[70%] p-4 rounded-lg bg-card ml-4 shadow-sm border border-border">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                            <div
                              className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                              style={{ animationDelay: '0.1s' }}
                            />
                            <div
                              className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                              style={{ animationDelay: '0.2s' }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Message
                        id={message.id}
                        role={message.role}
                        content={message.content}
                        timestamp={message.timestamp}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
