import { Wrench, CheckCircle, XCircle } from 'lucide-react';
import { useState, useCallback } from 'react';
import { ClipboardSetText } from '../../../wailsjs/runtime/runtime';
import { Copy, Check } from 'lucide-react';

interface ToolCallMessageProps {
  toolName: string;
  toolId: string;
  arguments: any;
  result?: {
    success: boolean;
    data?: any;
    error?: string;
    metadata?: Record<string, any>;
  };
  isExecuting?: boolean;
}

export function ToolCallMessage({
  toolName,
  toolId,
  arguments: args,
  result,
  isExecuting = false,
}: ToolCallMessageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      const content = `Tool: ${toolName}\nArguments: ${JSON.stringify(args, null, 2)}${
        result ? `\nResult: ${JSON.stringify(result, null, 2)}` : ''
      }`;

      if (typeof ClipboardSetText === 'function') {
        await ClipboardSetText(content);
      } else {
        await navigator.clipboard.writeText(content);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy tool call:', error);
    }
  }, [toolName, args, result]);

  const getStatusIcon = () => {
    if (isExecuting) {
      return <Wrench className="h-4 w-4 text-blue-500 animate-spin" />;
    }
    if (result?.success) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (result?.success === false) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    return <Wrench className="h-4 w-4 text-gray-500" />;
  };

  const getStatusText = () => {
    if (isExecuting) return 'Executing...';
    if (result?.success) return 'Completed';
    if (result?.success === false) return 'Failed';
    return 'Pending';
  };

  return (
    <>
      {/* Tool icon */}
      <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
        <Wrench className="h-4 w-4 text-white" />
      </div>

      {/* Tool call bubble */}
      <div className="relative max-w-[70%]">
        <div className="rounded-lg p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            {getStatusIcon()}
            <span className="font-medium text-blue-700 dark:text-blue-300">
              {toolName}
            </span>
            <span className="text-xs text-blue-600 dark:text-blue-400">
              {getStatusText()}
            </span>
          </div>

          {/* Arguments */}
          <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            <div className="font-medium mb-1">Arguments:</div>
            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto">
              {JSON.stringify(args, null, 2)}
            </pre>
          </div>

          {/* Result */}
          {result && (
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <div className="font-medium mb-1">Result:</div>
              <div
                className={`text-xs p-2 rounded ${
                  result.success
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                }`}
              >
                {result.success ? (
                  result.data ? (
                    <pre className="overflow-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  ) : (
                    'Success'
                  )
                ) : (
                  result.error || 'Failed'
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Copy button */}
      <div className="flex flex-col self-end gap-1 z-10 opacity-1 group-hover:opacity-100 transition-all duration-200">
        <button
          type="button"
          onClick={handleCopy}
          className={`p-1.5 rounded-md transition-all duration-200 hover:bg-muted text-muted-foreground backdrop-blur-sm border border-border/50 shadow-sm bg-background/80 ${
            copied ? 'scale-110 bg-green-100/80 text-green-600' : ''
          }`}
          title="Copy tool call"
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
