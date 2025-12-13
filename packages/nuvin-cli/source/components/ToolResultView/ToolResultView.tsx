import type React from 'react';
import { Box, Text } from 'ink';
import {
  type ToolExecutionResult,
  type ToolCall,
  type MetricsSnapshot,
  ErrorReason,
  isBashSuccess,
  isFileReadSuccess,
  isFileEditSuccess,
  isFileNewSuccess,
  isDirLsSuccess,
  isWebSearchSuccess,
  isWebFetchSuccess,
  isTodoWriteSuccess,
  isAssignSuccess,
} from '@nuvin/nuvin-core';
import { useTheme } from '@/contexts/ThemeContext.js';
import { Markdown } from '@/components/Markdown/index.js';
import { useStdoutDimensions } from '@/hooks/useStdoutDimensions.js';
import { TodoWriteRenderer } from './renderers/TodoWriteRenderer.js';
import { FileEditRenderer } from './renderers/FileEditRenderer.js';
import { FileReadRenderer } from './renderers/FileReadRenderer.js';
import { FileNewRenderer } from './renderers/FileNewRenderer.js';
import { BashToolRenderer } from './renderers/BashToolRenderer.js';
import { DefaultRenderer } from './renderers/DefaultRenderer.js';
import { formatDuration, formatTokens, formatCost } from '@/utils/formatters.js';
import { get } from '@/utils/get.js';

type ToolResultViewProps = {
  toolResult: ToolExecutionResult;
  toolCall?: ToolCall;
  messageId?: string;
  messageContent?: string;
  messageColor?: string;
  fullMode?: boolean;
  subAgentMetrics?: MetricsSnapshot;
};

export const ToolResultView: React.FC<ToolResultViewProps> = ({
  toolResult,
  toolCall,
  messageId,
  messageContent,
  messageColor,
  fullMode = false,
  subAgentMetrics,
}) => {
  const { theme } = useTheme();
  const [cols] = useStdoutDimensions();
  const statusColor = toolResult.status === 'success' ? theme.status.success : theme.status.error;
  const durationText = formatDuration(toolResult.durationMs);

  const getKeyParam = (): string | null => {
    if (!toolCall) return null;

    try {
      const args = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {};

      if (args.file_path) return args.file_path;
      if (args.path) return args.path;
      if (args.url) return args.url;
      if (args.query) return args.query.substring(0, 50) + (args.query.length > 50 ? '...' : '');
      if (args.command) return args.command.substring(0, 50) + (args.command.length > 50 ? '...' : '');
      if (args.cmd) return args.cmd.substring(0, 50) + (args.cmd.length > 50 ? '...' : '');

      return null;
    } catch (_error) {
      console.warn('Failed to parse tool arguments');
      return null;
    }
  };

  const getStatusMessage = () => {
    const isSuccess = toolResult.status === 'success';
    const errorReason = toolResult.status === 'error' ? toolResult.metadata?.errorReason : undefined;

    const keyParam = getKeyParam();
    const paramText = keyParam ?? '';

    // Handle error states based on errorReason metadata
    if (errorReason === ErrorReason.Aborted) {
      return {
        text: 'Aborted',
        color: theme.colors.warning || 'yellow',
        paramText,
      };
    }

    if (errorReason === ErrorReason.Denied) {
      return {
        text: 'Denied',
        color: theme.colors.warning || 'yellow',
        paramText,
      };
    }

    if (errorReason === ErrorReason.Timeout) {
      return {
        text: 'Timeout',
        color: theme.colors.warning || 'yellow',
        paramText,
      };
    }

    if (errorReason === ErrorReason.PermissionDenied) {
      return {
        text: 'Permission denied',
        color: theme.colors.error || 'red',
        paramText,
      };
    }

    if (errorReason === ErrorReason.NotFound) {
      return {
        text: 'Not found',
        color: theme.colors.error || 'red',
        paramText,
      };
    }

    if (errorReason === ErrorReason.ToolNotFound) {
      return {
        text: 'Tool not found',
        color: theme.colors.error || 'red',
        paramText,
      };
    }

    if (errorReason === ErrorReason.NetworkError) {
      return {
        text: 'Network error',
        color: theme.colors.error || 'red',
        paramText,
      };
    }

    if (errorReason === ErrorReason.RateLimit) {
      return {
        text: 'Rate limit',
        color: theme.colors.warning || 'yellow',
        paramText,
      };
    }

    if (errorReason === ErrorReason.InvalidInput) {
      return {
        text: 'Invalid input',
        color: theme.colors.error || 'red',
        paramText,
      };
    }

    // Tool-specific status messages
    switch (toolResult.name) {
      case 'assign_task': {
        if (isAssignSuccess(toolResult)) {
          const parts: string[] = ['Done'];
          const executionTimeMs = get(toolResult, 'metadata.executionTimeMs') as number | undefined;
          const toolCallsExecuted = get(toolResult, 'metadata.toolCallsExecuted') as number | undefined;
          const tokensUsed = get(toolResult, 'metadata.tokensUsed') as number | undefined;
          if (subAgentMetrics) {
            parts.push(`${subAgentMetrics.llmCallCount} calls`);
            parts.push(`${formatTokens(subAgentMetrics.totalTokens)} tokens`);
            if (subAgentMetrics.totalCost > 0) parts.push(`$${formatCost(subAgentMetrics.totalCost)}`);
            if (executionTimeMs) parts.push(`${formatDuration(executionTimeMs)}`);
          } else {
            if (toolCallsExecuted) parts.push(`${toolCallsExecuted} tools`);
            if (tokensUsed) parts.push(`${formatTokens(tokensUsed)} tokens`);
            if (executionTimeMs) parts.push(`${formatDuration(executionTimeMs)}`);
          }
          return {
            text: parts.join(' • '),
            color: statusColor,
            paramText,
          };
        }
        return {
          text: 'Error',
          color: statusColor,
          paramText,
        };
      }
      case 'file_edit': {
        if (isFileEditSuccess(toolResult)) {
          const bytesWritten = get(toolResult, 'metadata.bytesWritten') as number | undefined;
          const text = bytesWritten ? `Edited (${bytesWritten} bytes)` : 'Edited';
          return { text, color: statusColor, paramText };
        }
        return { text: 'Edit failed', color: statusColor, paramText };
      }
      case 'file_read': {
        if (isFileReadSuccess(toolResult)) {
          const lineCount = toolResult.result.split(/\r?\n/).length;
          return { text: `Read ${lineCount} lines`, color: statusColor, paramText };
        }
        return { text: 'Read failed', color: statusColor, paramText };
      }
      case 'file_new': {
        if (isFileNewSuccess(toolResult)) {
          const bytes = get(toolResult, 'metadata.bytes') as number | undefined;
          const text = bytes !== undefined ? `Created (${bytes} bytes)` : 'Created';
          return { text, color: statusColor, paramText };
        }
        return { text: 'Creation failed', color: statusColor, paramText };
      }
      case 'bash_tool': {
        if (isBashSuccess(toolResult)) {
          const code = get(toolResult, 'metadata.code') as number | undefined;
          const text = code !== undefined ? `Executed (exit ${code})` : 'Executed';
          return { text, color: statusColor, paramText };
        }
        return { text: 'Execution failed', color: statusColor, paramText };
      }
      case 'web_fetch': {
        if (isWebFetchSuccess(toolResult)) {
          const size = get(toolResult, 'metadata.size') as number | undefined;
          const statusCode = get(toolResult, 'metadata.statusCode') as number | undefined;
          const text =
            size !== undefined && statusCode !== undefined ? `Fetched (${statusCode}, ${size} bytes)` : 'Fetched';
          return { text, color: statusColor, paramText };
        }
        return { text: 'Fetch failed', color: statusColor, paramText };
      }
      case 'web_search': {
        if (isWebSearchSuccess(toolResult)) {
          const count = get(toolResult, 'result.count') as number | undefined;
          const text = count !== undefined ? `Searched (${count} results)` : 'Searched';
          return { text, color: statusColor, paramText };
        }
        return { text: 'Search failed', color: statusColor, paramText };
      }
      case 'todo_write': {
        if (isTodoWriteSuccess(toolResult)) {
          const stats = get(toolResult, 'metadata.stats') as { completed: number; total: number } | undefined;
          const progress = get(toolResult, 'metadata.progress') as string | undefined;
          const text = stats ? `Updated (${stats.completed}/${stats.total} - ${progress})` : 'Updated';
          return {
            text,
            color: statusColor,
            paramText,
            statusPosition: 'bottom',
          };
        }
        return {
          text: 'Update failed',
          color: statusColor,
          paramText,
          statusPosition: 'bottom',
        };
      }
      case 'dir_ls': {
        if (isDirLsSuccess(toolResult)) {
          const resultObj = toolResult.result as { entries: unknown[]; truncated?: boolean };
          const entryCount = resultObj.entries.length;
          const truncated = resultObj.truncated ? ' (truncated)' : '';
          const text = `Listed ${entryCount} entries${truncated}`;
          return { text, color: statusColor, paramText };
        }
        return { text: 'Listing failed', color: statusColor, paramText };
      }
      default:
        return { text: isSuccess ? 'Completed' : 'Failed', color: statusColor, paramText };
    }
  };

  const renderContent = () => {
    switch (toolResult.name) {
      case 'assign_task': {
        if (isAssignSuccess(toolResult)) {
          const resultStr = (toolResult.result as string).replace(/\\n/g, '\n');
          return <Markdown maxWidth={cols - 12}>{resultStr}</Markdown>;
        }
        const errorStr =
          toolResult.type === 'text' ? (toolResult.result as string) : JSON.stringify(toolResult.result, null, 2);
        return <Markdown maxWidth={cols - 12}>{errorStr}</Markdown>;
      }
      case 'todo_write':
        return <TodoWriteRenderer toolResult={toolResult} messageId={messageId} fullMode={fullMode} />;
      case 'file_edit':
        return (
          <FileEditRenderer toolResult={toolResult} toolCall={toolCall} messageId={messageId} fullMode={fullMode} />
        );
      case 'file_read':
        return (
          <FileReadRenderer
            toolResult={toolResult}
            messageId={messageId}
            messageContent={messageContent}
            messageColor={messageColor}
            fullMode={fullMode}
          />
        );
      case 'file_new':
        return (
          <FileNewRenderer
            toolResult={toolResult}
            toolCall={toolCall}
            messageId={messageId}
            messageContent={messageContent}
            messageColor={messageColor}
            fullMode={fullMode}
          />
        );
      case 'bash_tool':
        return (
          <BashToolRenderer
            toolResult={toolResult}
            messageId={messageId}
            messageContent={messageContent}
            messageColor={messageColor}
            fullMode={fullMode}
          />
        );
      default:
        return (
          <DefaultRenderer
            toolResult={toolResult}
            messageId={messageId}
            messageContent={messageContent}
            messageColor={messageColor}
            fullMode={fullMode}
          />
        );
    }
  };

  const { text, color, statusPosition = 'top' } = getStatusMessage();
  const content = renderContent();

  const hasResult = toolResult.result !== null && toolResult.result !== undefined && toolResult.result !== '';
  const shouldShowContent =
    (hasResult || toolResult.name === 'todo_write') &&
    ((toolResult.name !== 'file_read' && toolResult.name !== 'file_new' && toolResult.name !== 'assign_task') ||
      fullMode);

  const shouldShowDone =
    (toolResult.name !== 'file_read' && toolResult.name !== 'file_new' && toolResult.name !== 'assign_task') ||
    fullMode;
  const shouldShowStatus = hasResult || toolResult.name === 'todo_write';

  const showStatusTop = shouldShowStatus && statusPosition === 'top';
  const showStatusBottom = shouldShowStatus && statusPosition === 'bottom';
  const showDone = shouldShowDone && statusPosition === 'top';

  return (
    <Box marginLeft={2} flexDirection="column">
      {showStatusTop && (
        <Box flexDirection="row">
          <Text dimColor color={color}>
            {`${shouldShowContent || shouldShowDone ? '├─' : '└─'} ${text}`}
          </Text>
        </Box>
      )}
      {shouldShowContent && (
        <Box
          borderStyle="single"
          borderColor={color}
          borderDimColor
          borderBottom={false}
          borderRight={false}
          borderTop={false}
          flexDirection="column"
          paddingLeft={2}
          width={cols - 10}
        >
          {content}
        </Box>
      )}
      {showDone && (
        <Box flexDirection="row">
          {durationText && (toolResult.durationMs ?? 0) > 1000 ? (
            <Text dimColor color={color}>{`└─ Done in ${durationText}`}</Text>
          ) : (
            <Text dimColor color={color}>{`└─ Done`}</Text>
          )}
        </Box>
      )}
      {showStatusBottom && (
        <Box flexDirection="row">
          <Text dimColor color={color}>{`└─ ${text}`}</Text>
        </Box>
      )}
    </Box>
  );
};
