import type React from 'react';
import { Box, Text } from 'ink';
import type { ToolExecutionResult } from '@nuvin/nuvin-core';
import { useTheme } from '@/contexts/ThemeContext.js';
import { parseDetailLines } from '@/components/ToolResultView/utils.js';
import { useStdoutDimensions } from '@/hooks/index.js';

type FileReadRendererProps = {
  toolResult: ToolExecutionResult;
  messageId?: string;
  messageContent?: string;
  messageColor?: string;
  fullMode?: boolean;
};

export const FileReadRenderer: React.FC<FileReadRendererProps> = ({
  toolResult,
  messageId,
  messageColor,
  fullMode = false,
}) => {
  const { theme } = useTheme();
  const [cols] = useStdoutDimensions();

  const statusColor = toolResult.status === 'success' ? theme.tokens.gray : theme.tokens.red;
  const detailColor = messageColor ?? statusColor;

  if (toolResult.status === 'success') {
    const fileContent = typeof toolResult.result === 'string' ? toolResult.result : '';

    if (!fullMode) {
      return null;
    }

    const linesToRender = fileContent.split(/\r?\n/);
    return (
      <Box flexDirection="column" width={cols - 10}>
        {linesToRender.map((line, idx) => (
          <Text key={`${messageId}-tool-result-${idx}`} dimColor color={detailColor}>
            {line}
          </Text>
        ))}
      </Box>
    );
  }

  return null;
};
