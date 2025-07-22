import { Cpu, Copy, Check, FileText } from 'lucide-react';
import { useState, useCallback, useMemo } from 'react';
import { parseToolCalls, stripToolCalls } from '@/lib/utils/tool-call-parser';
import { ClipboardSetText } from '../../../wailsjs/runtime/runtime';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ToolCall } from './components/ToolCall';

interface AssistantMessageProps {
  content: string;
  isStreaming?: boolean;
  messageMode: 'normal' | 'transparent';
}

export function AssistantMessage({
  content,
  isStreaming = false,
  messageMode,
}: AssistantMessageProps) {
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const trimmedContent = content.trim();

  // Parse tool calls from the content
  const parsedContent = useMemo(() => {
    return parseToolCalls(trimmedContent);
  }, [trimmedContent]);

  // Get clean content without tool call markup
  const cleanContent = useMemo(() => {
    return parsedContent.hasToolCalls
      ? stripToolCalls(trimmedContent)
      : trimmedContent;
  }, [parsedContent.hasToolCalls, trimmedContent]);

  const handleCopy = useCallback(async () => {
    try {
      // Copy raw content in raw view, clean content otherwise
      const contentToCopy = showRaw ? trimmedContent : cleanContent;

      if (typeof ClipboardSetText === 'function') {
        await ClipboardSetText(contentToCopy);
      } else {
        await navigator.clipboard.writeText(contentToCopy);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  }, [trimmedContent, cleanContent, showRaw]);

  const toggleRawView = useCallback(() => {
    setShowRaw((prev) => !prev);
  }, []);

  if (trimmedContent.length === 0) return null;

  return (
    <>
      {/* Assistant avatar */}
      <div
        className={`h-8 w-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 relative overflow-hidden ${isStreaming ? 'animate-pulse' : ''}`}
      >
        {isStreaming && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/30 to-transparent animate-ping" />
        )}
        <Cpu
          className={`h-4 w-4 text-primary-foreground relative z-10 ${isStreaming ? 'animate-bounce' : ''}`}
        />
      </div>

      {/* Message bubble */}
      <div
        className={`max-w-[70%] rounded-lg overflow-auto transition-all duration-300 p-4 ${
          messageMode === 'transparent'
            ? 'text-foreground'
            : isStreaming
              ? 'bg-gradient-to-br from-card to-card/80 border-border/50 shadow-md border'
              : 'bg-card border-border hover:shadow-xl hover:border-border/80 shadow-lg border'
        }`}
      >
        {showRaw ? (
          // Raw view
          <pre className="text-sm whitespace-pre-wrap font-sans">
            {trimmedContent}
          </pre>
        ) : (
          // Rendered view
          <div className="text-sm relative">
            {/* Render tool calls first */}
            {parsedContent.hasToolCalls &&
              parsedContent.toolCalls.map((toolCall, index) => (
                <ToolCall
                  key={`${toolCall.name}-${toolCall.id}-${index}`}
                  toolCall={toolCall}
                />
              ))}

            {/* Render clean content if there's any */}
            {cleanContent.trim().length > 0 && (
              <MarkdownRenderer
                content={cleanContent}
                className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
              />
            )}

            {isStreaming && (
              <div className="inline-flex items-center animate-in fade-in duration-300">
                <span className="text-xs text-muted-foreground/80 animate-pulse">
                  Generating...
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls for assistant messages */}
      <div className="flex flex-col self-end gap-1 z-10 opacity-1 group-hover:opacity-100 transition-all duration-200">
        <button
          type="button"
          onClick={toggleRawView}
          className={`p-1.5 rounded-md transition-all duration-200 hover:bg-muted text-muted-foreground backdrop-blur-sm border border-border/50 shadow-sm ${
            showRaw ? 'bg-muted/80' : 'bg-background/80'
          }`}
          title={showRaw ? 'Show rendered content' : 'Show raw content'}
        >
          <FileText className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className={`p-1.5 rounded-md transition-all duration-200 hover:bg-muted text-muted-foreground backdrop-blur-sm border border-border/50 shadow-sm bg-background/80 ${copied ? 'scale-110 bg-green-100/80 text-green-600' : ''}`}
          title="Copy message"
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>
    </>
  );
}
