import type React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '@/contexts/ThemeContext.js';
import type { CompleteCustomCommand, CommandSource } from '@nuvin/nuvin-core';

interface CommandListProps {
  commands: CompleteCustomCommand[];
  selectedIndex: number;
}

const SOURCE_LABELS: Record<CommandSource, string> = {
  global: 'G',
  profile: 'P',
  local: 'L',
};

export const CommandList: React.FC<CommandListProps> = ({ commands, selectedIndex }) => {
  const { theme } = useTheme();

  return (
    <Box flexDirection="column" width="30" marginRight={2}>
      <Box marginBottom={1}>
        <Text color={theme.tokens.cyan} bold>
          Commands ({commands.length})
        </Text>
      </Box>

      {commands.map((cmd, index) => {
        const isSelected = index === selectedIndex;
        const sourceLabel = SOURCE_LABELS[cmd.source];

        return (
          <Box key={`${cmd.id}-${cmd.source}`} marginBottom={0}>
            <Text
              color={isSelected ? theme.tokens.cyan : theme.history.unselected}
              bold={isSelected}
            >
              {isSelected ? '› ' : '  '}
              /{cmd.id}
            </Text>
            <Text> </Text>
            <Text color={theme.history.help} dimColor>
              [{sourceLabel}]
            </Text>
          </Box>
        );
      })}

      {commands.length === 0 && (
        <Text color={theme.history.help} dimColor>
          No commands found
        </Text>
      )}
    </Box>
  );
};
