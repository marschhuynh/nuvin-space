import {
  useState,
  type KeyboardEvent,
  useEffect,
  useRef,
  useCallback,
  memo,
} from 'react';
import { Textarea } from '@/components/ui/textarea';
import SendButton from './components/SendButton';

interface ChatInputProps {
  onSendMessage?: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

const ChatInput = memo(function ChatInput({
  onSendMessage,
  onStop,
  disabled = false,
  placeholder = 'Type your message here...',
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isMultiLine, setIsMultiLine] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

      // Ensure we stay within bounds
      const newHeight = Math.min(
        Math.max(scrollHeight + 2, minHeight),
        maxHeight,
      );

      // Set the calculated height
      textarea.style.height = `${newHeight}px`;

      // Determine if we're in multi-line mode (height greater than single line)
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

  // Auto-resize on component mount
  useEffect(() => {
    autoResize();
  }, [autoResize]);

  const isLoading = disabled; // Loading state when disabled

  return (
    <div className="border-t border-border p-6 bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="resize-none focus-visible:ring-0 shadow-sm pr-16 py-4 px-4 bg-background border focus-visible:border-gray-400 transition-all duration-200 chat-input-textarea overflow-auto text-base placeholder:text-gray-400/60 focus:placeholder:text-gray-300/50"
            rows={1}
          />

          {/* Send button */}
          <SendButton
            message={message}
            isLoading={isLoading}
            isMultiLine={isMultiLine}
            handleStop={handleStop}
            handleSend={handleSend}
          />
        </div>

        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>Press Shift + Enter for new line</span>
        </div>
      </div>
    </div>
  );
});

export { ChatInput };
