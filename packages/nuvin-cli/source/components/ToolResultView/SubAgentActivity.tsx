import type React from 'react';
import { Box, Text } from 'ink';
import {
  type ToolCall,
  type ToolExecutionResult,
  type SubAgentState,
  parseToolArguments,
  type ToolArguments,
} from '@nuvin/nuvin-core';
import type { MessageLine as MessageLineType } from '@/adapters/index.js';
import { useTheme } from '@/contexts/ThemeContext.js';
import { useExplainMode } from '@/contexts/ExplainModeContext.js';
import { ToolResultView } from './ToolResultView.js';
import { useStdoutDimensions } from '@/hooks/useStdoutDimensions.js';
import { ToolTimer } from '../ToolTimer.js';
import { GradientRunText } from '../Gradient.js';
import { formatCost, formatDuration, formatTokens } from '@/utils/formatters.js';

type SubAgentActivityProps = {
  toolCall: ToolCall;
  subAgentState: SubAgentState;
  toolResult?: MessageLineType;
  messageId: string;
};

/**
 * Extract the most relevant parameter for display based on tool name
 */
const extractRelevantParameter = (toolName: string, args: ToolArguments): string | undefined => {
  // Always prefer description if available
  if ('description' in args && args.description) {
    return args.description;
  }

  // Tool-specific parameter extraction using discriminated union by name
  switch (toolName) {
    case 'bash_tool':
      if ('cmd' in args) return args.cmd;
      break;

    case 'file_read':
      if ('path' in args) {
        let value = args.path;
        if ('lineStart' in args && 'lineEnd' in args && args.lineStart && args.lineEnd) {
          value += ` (lines ${args.lineStart}-${args.lineEnd})`;
        }
        return value;
      }
      break;

    case 'file_edit':
    case 'file_new':
      if ('file_path' in args) return args.file_path;
      break;

    case 'dir_ls':
      if ('path' in args) {
        let value = args.path || '.';
        if ('limit' in args && args.limit) {
          value += ` (limit: ${args.limit})`;
        }
        return value;
      }
      return '.';

    case 'web_search':
      if ('query' in args) {
        let value = args.query;
        if ('count' in args && args.count) {
          value += ` (${args.count} results)`;
        }
        return value;
      }
      break;

    case 'web_fetch':
      if ('url' in args) return args.url;
      break;

    case 'assign_task':
      if ('agent' in args && 'task' in args) {
        const taskDisplay = 'description' in args && args.description ? args.description : args.task.substring(0, 50);
        return `${args.agent}: ${taskDisplay}`;
      }
      break;

    case 'todo_write':
      if ('todos' in args && Array.isArray(args.todos)) {
        // Check for status changes to show specific item updates
        const completedItems = args.todos.filter((todo) => todo.status === 'completed');
        const inProgressItems = args.todos.filter((todo) => todo.status === 'in_progress');

        if (completedItems.length === 1 && args.todos.length > 1) {
          // Show specific item completion
          const completedItem = completedItems[0];
          return `${completedItem.content} => Done`;
        } else if (inProgressItems.length === 1 && args.todos.length > 1) {
          // Show specific item started
          const inProgressItem = inProgressItems[0];
          return `${inProgressItem.content} => In Progress`;
        }

        return `${args.todos.length} todos`;
      }
      break;

    default:
      // For unknown tools, try to find a meaningful parameter
      if ('name' in args && typeof args.name === 'string') return args.name;
      if ('id' in args && typeof args.id === 'string') return args.id;
      if ('value' in args && typeof args.value === 'string') return args.value;
      break;
  }

  return undefined;
};

/**
 * SubAgentActivity - Displays sub-agent execution activity in real-time
 *
 * Shows:
 * - Agent name with live timer
 * - Task parameters
 * - Progress indicator (Starting... → Running... → success/error)
 * - Tool calls with durations
 * - Final result message
 */
export const SubAgentActivity: React.FC<SubAgentActivityProps> = ({
  toolCall,
  subAgentState,
  toolResult,
  messageId,
}) => {
  const [cols] = useStdoutDimensions();
  const { theme } = useTheme();
  const { explainMode } = useExplainMode();

  // Parse arguments to display
  const args =
    typeof toolCall.function.arguments === 'string'
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;

  const agentParam = args.agent || 'unknown';
  const taskParam = args.task || '';
  const taskDescriptionParam = args.description || '';

  const isCompleted = subAgentState.status === 'completed';
  const toolExecutionResult = toolResult?.metadata?.toolResult as ToolExecutionResult | undefined;

  // Determine status color
  let statusColor = theme.colors.textDim;
  if (isCompleted && subAgentState.finalStatus === 'success') {
    statusColor = theme.status.success;
  } else if (isCompleted && subAgentState.finalStatus === 'error') {
    statusColor = theme.status.error;
  }

  // Format agent name from ID
  const formatAgentName = (agentId: string): string => {
    return agentId
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Box flexDirection="column" marginTop={1}>
      {/* Header: [Agent Name] */}
      <Box flexDirection="row">
        <Box flexShrink={0} marginRight={1}>
          <Text color={theme.messageTypes.tool} bold>
            »
          </Text>
        </Box>
        <Text>{`${formatAgentName(agentParam)}${taskDescriptionParam ? ` (${taskDescriptionParam})` : ''}`}</Text>
      </Box>

      {/* Parameters: agent and task */}
      <Box flexDirection="column" marginLeft={2}>
        {explainMode && (
          <>
            <Box
              flexDirection="column"
              borderStyle="single"
              borderDimColor
              borderColor={statusColor}
              borderBottom={false}
              borderRight={false}
              borderTop={false}
              paddingLeft={2}
              width={cols - 6}
            >
              {Object.entries({ agent: agentParam, task: taskParam, description: taskDescriptionParam }).map(
                ([key, value]) => (
                  <Text key={key} dimColor>{`${key}: ${value}`}</Text>
                ),
              )}
            </Box>
            <Box flexDirection="row">
              <Text dimColor color={statusColor}>
                ├─{' '}
              </Text>
              <Text>Activities</Text>
            </Box>
          </>
        )}
        <Box
          flexDirection="column"
          borderStyle="single"
          borderDimColor
          borderColor={statusColor}
          borderBottom={false}
          borderRight={false}
          borderTop={false}
          paddingLeft={2}
        >
          {subAgentState.toolCalls.map((toolCall) => {
            // Parse arguments if available
            let argsDisplay = '';
            const detailsDisplay: string | null = null;

            if (toolCall.arguments) {
              try {
                const args = parseToolArguments(toolCall.arguments);
                const relevantValue = extractRelevantParameter(toolCall.name, args);

                if (relevantValue) {
                  const maxLen = Math.max(50, cols - 30);
                  const truncated =
                    relevantValue.length > maxLen ? `${relevantValue.slice(0, maxLen)}...` : relevantValue;
                  argsDisplay = ` ${truncated}`;
                }
              } catch {
                // Ignore parse errors
              }
            }

            // Determine status icon and color
            let statusIcon = '  ';
            let statusIconColor = theme.colors.textDim;
            if (toolCall.status === 'success') {
              statusIcon = '✓ ';
              statusIconColor = theme.status.success;
            } else if (toolCall.status === 'error') {
              statusIcon = '✗ ';
              statusIconColor = theme.status.error;
            }

            return (
              <Box key={toolCall.id} flexDirection="column">
                <Box flexDirection="row">
                  {statusIcon ? <Text color={statusIconColor}>{statusIcon}</Text> : null}
                  <Text dimColor>
                    {toolCall.name}
                    {argsDisplay}
                    {toolCall.durationMs !== undefined && explainMode ? ` (${formatDuration(toolCall.durationMs)})` : ''}
                  </Text>
                </Box>
                {detailsDisplay && explainMode && (
                  <Box marginLeft={3}>
                    <Text dimColor color={theme.colors.textDim}>
                      {detailsDisplay}
                    </Text>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>

      {!isCompleted && (
        <Box flexDirection="row" marginLeft={2}>
          <Text dimColor color={statusColor}>
            └─{' '}
          </Text>
          <GradientRunText text="Working ..." />
          {!explainMode && (
            <Box marginLeft={1}>
              <ToolTimer hasResult={isCompleted} finalDuration={subAgentState.totalDurationMs} />
            </Box>
          )}
          {subAgentState.metrics && (
            <Box marginLeft={1}>
              <Text dimColor>
                • {subAgentState.metrics.llmCallCount} calls • {formatTokens(subAgentState.metrics.totalTokens)} tokens
                {subAgentState.metrics.totalCost > 0 && ` • $${formatCost(subAgentState.metrics.totalCost)}`}
              </Text>
            </Box>
          )}
        </Box>
      )}

      {/* Tool Result (when available) - handled by ToolResultView with assign_task special case */}
      {isCompleted && toolExecutionResult && toolResult ? (
        <Box marginBottom={1}>
          <ToolResultView
            toolResult={toolExecutionResult}
            toolCall={toolCall}
            messageId={`${messageId}-result-${toolCall.id}`}
            messageContent={toolResult.content || ''}
            fullMode={explainMode}
            subAgentMetrics={subAgentState.metrics}
          />
        </Box>
      ) : null}
    </Box>
  );
};
