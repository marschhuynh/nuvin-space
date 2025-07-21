import { Button } from '@/components';
import { Send as SendIcon, Square } from 'lucide-react';

interface SendProps {
  message: string;
  isLoading?: boolean;
  isMultiLine: boolean;
  handleStop: () => void;
  handleSend: () => void;
}

export default function SendButton({
  message,
  isLoading,
  isMultiLine,
  handleStop,
  handleSend,
}: SendProps) {
  return (
    <div
      className={`absolute right-4 transition-all duration-200 ${message.trim() || isLoading ? 'opacity-100' : 'opacity-0'} ${
        isMultiLine
          ? 'bottom-4' // Bottom alignment for multi-line
          : 'top-1/2 transform -translate-y-1/2' // Centered for single line
      }`}
    >
      {isLoading ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={handleStop}
          className="h-8 w-8 p-0 rounded-full bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 stop-button-animate transition-all duration-200"
        >
          <Square
            className="h-3 w-3 text-red-600 dark:text-red-400"
            fill="currentColor"
          />
        </Button>
      ) : (
        <Button
          size="sm"
          disabled={!message.trim()}
          onClick={handleSend}
          className={`h-8 w-8 p-0 rounded-full transition-all duration-200 ${
            message.trim()
              ? 'bg-primary hover:bg-primary/90 send-button-ready'
              : 'bg-muted send-button-disabled opacity-0'
          }`}
        >
          <SendIcon
            className={`h-3 w-3 transition-transform duration-200 ${
              message.trim() ? 'scale-100 opacity-100' : 'scale-75 opacity-30'
            }`}
          />
        </Button>
      )}
    </div>
  );
}
