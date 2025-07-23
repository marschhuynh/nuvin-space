import { Cpu, Copy, Check, FileText, Info } from 'lucide-react';
import { useState, useCallback, useMemo } from 'react';
import { parseToolCalls, stripToolCalls } from '@/lib/utils/tool-call-parser';
import { ClipboardSetText } from '../../../wailsjs/runtime/runtime';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ToolCall } from './components/ToolCall';
import type { MessageMetadata } from '@/types';

interface AssistantMessageProps {
  content: string;
  isStreaming?: boolean;
  messageMode: 'normal' | 'transparent';
  metadata?: MessageMetadata;
}

export function AssistantMessage({
  content,
  isStreaming = false,
  messageMode,
  metadata,
}: AssistantMessageProps) {
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);

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

  const toggleMetadataView = useCallback(() => {
    setShowMetadata((prev) => !prev);
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

      {/* Message bubble container with metadata */}
      <div className="relative max-w-[70%]">
        {/* Message bubble */}
        <div
          className={`rounded-lg overflow-auto transition-all duration-300 p-4 ${
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

        {/* Metadata positioned below the message */}
        {showMetadata && metadata && (
          <div className="mt-1 bg-background/95 dark:bg-background/90 backdrop-blur-sm border border-border/50 rounded px-2 py-1 shadow-sm">
            <div className="flex items-center justify-between text-xs text-muted-foreground whitespace-nowrap">
              {/* Left side - Provider */}
              <div className="flex items-center gap-2">
                {metadata.provider && (
                  <span className="text-foreground font-medium">
                    [{metadata.provider}] {metadata.model ? metadata.model : ''}
                  </span>
                )}
              </div>

              {/* Center - Model and tokens */}
              <div className="flex items-center gap-2">
                {(metadata.promptTokens ||
                  metadata.completionTokens ||
                  metadata.totalTokens) && (
                  <div className="flex items-center gap-1">
                    {metadata.promptTokens && (
                      <span className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                        {metadata.promptTokens > 5000
                          ? `${(metadata.promptTokens / 1000).toFixed(1)}k`
                          : metadata.promptTokens.toLocaleString()}
                      </span>
                    )}
                    <span>→</span>
                    {metadata.completionTokens && (
                      <span className="px-1 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">
                        {metadata.completionTokens > 5000
                          ? `${(metadata.completionTokens / 1000).toFixed(1)}k`
                          : metadata.completionTokens.toLocaleString()}
                      </span>
                    )}
                    {metadata.totalTokens && (
                      <>
                        <span>=</span>
                        <span className="px-1 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">
                          {metadata.totalTokens > 5000
                            ? `${(metadata.totalTokens / 1000).toFixed(1)}k`
                            : metadata.totalTokens.toLocaleString()}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Right side - Cost and performance */}
              <div className="flex items-center gap-2">
                {metadata.responseTime && (
                  <span>
                    {metadata.responseTime > 10000
                      ? `${(metadata.responseTime / 1000).toFixed(1)}s`
                      : `${metadata.responseTime}ms`}
                  </span>
                )}
                {metadata.estimatedCost !== undefined && (
                  <span className="font-mono text-green-600 font-medium">
                    ${metadata.estimatedCost.toFixed(6)}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls for assistant messages */}
      <div className="flex flex-col self-end gap-1 z-10 opacity-1 group-hover:opacity-100 transition-all duration-200">
        {metadata && (
          <button
            type="button"
            onClick={toggleMetadataView}
            className={`p-1.5 rounded-md transition-all duration-200 hover:bg-muted text-muted-foreground backdrop-blur-sm border border-border/50 shadow-sm ${
              showMetadata ? 'bg-muted/80' : 'bg-background/80'
            }`}
            title={showMetadata ? 'Hide metadata' : 'Show metadata'}
          >
            <Info className="h-4 w-4" />
          </button>
        )}
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
