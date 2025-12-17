import type React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '@/contexts/ThemeContext.js';
import type { MCPServerInfo } from '@/services/MCPServerManager.js';

interface MCPServerItemProps {
  item: MCPServerInfo;
  isSelected: boolean;
  allowedCount: number;
  totalCount: number;
  disabled?: boolean;
  reconnecting?: boolean;
}

export const MCPServerItem: React.FC<MCPServerItemProps> = ({ item, isSelected, allowedCount, totalCount, disabled, reconnecting }) => {
  const { theme } = useTheme();
  const isFailed = item.status === 'failed';
  const isPending = item.status === 'pending';
  
  let statusColor: string;
  let statusIcon: string;
  
  if (reconnecting) {
    statusColor = 'cyan';
    statusIcon = '↻';
  } else if (disabled) {
    statusColor = theme.history.unselected;
    statusIcon = '◌';
  } else if (isFailed) {
    statusColor = 'red';
    statusIcon = '✗';
  } else if (isPending) {
    statusColor = 'yellow';
    statusIcon = '○';
  } else {
    statusColor = 'green';
    statusIcon = '●';
  }

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={statusColor} bold>
          {statusIcon}
        </Text>
        <Text> </Text>
        <Text
          color={isSelected ? theme.tokens.cyan : theme.history.unselected}
          bold={isSelected}
          dimColor={!isSelected || disabled}
          strikethrough={disabled}
        >
          {item.id}
        </Text>
        {reconnecting && (
          <Text color="cyan" dimColor>
            {' '}(connecting...)
          </Text>
        )}
        {!disabled && !reconnecting && (
          <Text color={theme.history.badge} dimColor={!isSelected}>
            {' '}
            [{allowedCount}/{totalCount}]
          </Text>
        )}
        {disabled && !reconnecting && (
          <Text color={theme.history.unselected} dimColor>
            {' '}(disabled)
          </Text>
        )}
      </Box>
    </Box>
  );
};
