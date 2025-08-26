import { useState, type KeyboardEvent, useEffect, useRef, useCallback, memo } from 'react';
import { Textarea } from '@/components/ui/textarea';
import SendButton from './components/SendButton';
import { Switch } from '@/components/ui/switch';
import { useConversationStore } from '@/store';
import { Zap } from 'lucide-react';

interface ChatInputProps {
  onSendMessage?: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  placeholder?: string;
  showWithoutConversation?: boolean;
  centered?: boolean;
}

const ChatInput = memo(function ChatInput({
  onSendMessage,
  onStop,
  disabled = false,
  placeholder = 'Type your message here...',
  showWithoutConversation = false,
  centered = false,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isMultiLine, setIsMultiLine] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Conversation store for sudo mode
  const { activeConversationId, isSudoModeEnabled, toggleSudoMode } = useConversationStore();

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage?.(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStop = () => {
    onStop?.();
  };

  const autoResize = useCallback(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;

      // Reset height to auto to get the actual scroll height
      textarea.style.height = 'auto';

      // Calculate the new height based on scroll height
      const scrollHeight = textarea.scrollHeight;
      const minHeight = 58; // Increased min height for more padding
      const maxHeight = 200; // Increased max height proportionally

      const newHeight = Math.min(Math.max(scrollHeight + 2, minHeight), maxHeight);

      textarea.style.height = `${newHeight}px`;

      setIsMultiLine(newHeight > minHeight);
    }
  }, []);

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Trigger resize after state update
    setTimeout(autoResize, 0);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: <Auto-resize when message changes>
  useEffect(() => {
    autoResize();
  }, [message]);

  useEffect(() => {
    autoResize();
  }, [autoResize]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  });

  const isLoading = disabled; // Loading state when disabled

  if (!activeConversationId && !showWithoutConversation) {
    return null;
  }

  const containerClass = centered
    ? 'flex-1 flex flex-col justify-center items-center px-8'
    : 'p-6 bg-message-list-background';

  return (
    <div className={containerClass}>
      <div className={centered ? 'w-full max-w-4xl' : 'max-w-4xl mx-auto'}>
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="resize-none focus-visible:ring-0 shadow-none py-4 px-4 bg-background border focus-visible:border-gray-400 transition-all duration-200 chat-input-textarea overflow-auto text-base placeholder:text-gray-400/60 focus:placeholder:text-gray-300/50 pr-12"
            rows={1}
          />

          <SendButton
            message={message}
            isLoading={isLoading}
            isMultiLine={isMultiLine}
            handleStop={handleStop}
            handleSend={handleSend}
          />
        </div>

        <div className="flex justify-between items-center text-xs text-muted-foreground mt-2 h-6">
          <span>Press Shift + Enter for new line</span>
          {activeConversationId && (
            <div className="flex items-center gap-2 text-orange-600">
              <Zap className="w-3 h-3" />
              <span className="font-medium">Sudo Mode</span>
              <Switch
                checked={isSudoModeEnabled(activeConversationId)}
                onCheckedChange={() => toggleSudoMode(activeConversationId)}
                className="scale-75"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export { ChatInput };
