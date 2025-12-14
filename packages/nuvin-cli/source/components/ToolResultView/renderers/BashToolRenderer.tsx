import type React from 'react';
import { useState } from 'react';
import { Box, Text } from 'ink';
import type { ToolExecutionResult } from '@nuvin/nuvin-core';
import { LatestView } from '@/components/LatestView.js';
import { parseDetailLines } from '@/components/ToolResultView/utils.js';
import { useTheme } from '@/contexts/ThemeContext.js';
import { LAYOUT } from './constants.js';

type BashToolRendererProps = {
  toolResult: ToolExecutionResult;
  messageId?: string;
  messageContent?: string;
  messageColor?: string;
  fullMode?: boolean;
  cols: number;
};

export const BashToolRenderer: React.FC<BashToolRendererProps> = ({
  toolResult,
  messageContent,
  fullMode = false,
  cols,
}) => {
  const { theme } = useTheme();
  const [isExpanded] = useState(fullMode);
  
  const statusColor = toolResult.status === 'success' ? theme.tokens.green : theme.tokens.red;
  
  const lines = parseDetailLines({ 
    status: toolResult.status, 
    messageContent, 
    toolResult 
  });
  
  // Filter out empty lines and check if there's meaningful content
  const meaningfulLines = lines.filter(line => line.trim().length > 0);
  
  // Return null only if there's truly no content to show
  if (meaningfulLines.length === 0 && toolResult.status === 'success') return null;
  
  const content = meaningfulLines.join('\n');
  const effectiveMaxLines = isExpanded ? 50 : 10; // Show more lines in expanded mode
  const effectiveHeight = isExpanded ? 20 : 10; // Larger height in expanded mode
  
  return (
    <Box flexDirection="column" width={cols - LAYOUT.CONTENT_MARGIN}>
      {/* Status indicator */}
      <Box marginBottom={1}>
        <Text color={statusColor}>
          {toolResult.status === 'success' ? '✓' : '✗'} Command output
        </Text>
        {!fullMode && (
          <Text color={theme.tokens.gray}>
            {' '}(Press Enter to {isExpanded ? 'collapse' : 'expand'})
          </Text>
        )}
      </Box>
      
      {/* LatestView with bash output */}
      <LatestView
        height={effectiveHeight}
        maxLines={effectiveMaxLines}
        borderColor={toolResult.status === 'success' ? theme.tokens.green : theme.tokens.red}
        backgroundColor={theme.tokens.dim}
      >
        {content}
      </LatestView>
      
      {/* Summary info */}
      <Box marginTop={1}>
        <Text color={theme.tokens.gray}>
          {meaningfulLines.length} lines total • Showing last {Math.min(effectiveMaxLines, meaningfulLines.length)} lines
        </Text>
      </Box>
    </Box>
  );
};
