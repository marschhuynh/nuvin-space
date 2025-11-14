import type React from 'react';
import { Box, Text } from 'ink';
import type { ToolExecutionResult } from '@nuvin/nuvin-core';
import { useTheme } from '@/contexts/ThemeContext.js';
import { parseDetailLines } from '@/components/ToolResultView/utils.js';
import { useStdoutDimensions } from '@/hooks/index.js';

const DEFAULT_MAX_LINES = 10;
const DEFAULT_MAX_LINE_LENGTH = 200;

type BashToolRendererProps = {
  toolResult: ToolExecutionResult;
  messageId?: string;
  messageContent?: string;
  messageColor?: string;
  fullMode?: boolean;
};

export const BashToolRenderer: React.FC<BashToolRendererProps> = ({
  toolResult,
  messageId,
  messageContent,
  messageColor,
  fullMode = false,
}) => {
  const { theme } = useTheme();
  const [cols] = useStdoutDimensions();

  const statusColor = toolResult.status === 'success' ? theme.tokens.gray : theme.tokens.red;
  const detailColor = messageColor ?? statusColor;
  const linesToRender = parseDetailLines({ status: toolResult.status, messageContent, toolResult });
  const maxLines = fullMode ? Number.POSITIVE_INFINITY : DEFAULT_MAX_LINES;
  const maxLineLength = fullMode ? Number.POSITIVE_INFINITY : DEFAULT_MAX_LINE_LENGTH;

  if (linesToRender.length === 0) return null;

  const truncateLine = (line: string): string => {
    if (fullMode || line.length <= maxLineLength) return line;
    return `${line.slice(0, maxLineLength)}... (${line.length - maxLineLength} more chars)`;
  };

  const linesToShow = fullMode ? linesToRender : linesToRender.slice(-maxLines);
  const skippedLines = !fullMode && linesToRender.length > maxLines ? linesToRender.length - maxLines : 0;

  return (
    <Box flexDirection="column" width={cols - 10}>
      {skippedLines > 0 && (
        <Text dimColor color={theme.colors.muted}>
          ... ({skippedLines} more lines)
        </Text>
      )}
      {linesToShow.map((line, idx) => (
        <Text
          // biome-ignore lint/suspicious/noArrayIndexKey: Lines are static and order-dependent, index is stable
          key={`${messageId}-tool-result-${line}-${idx}`}
          dimColor
          color={detailColor}
        >
          {truncateLine(line)}
        </Text>
      ))}
    </Box>
  );
};
