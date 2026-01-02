import type React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '@/contexts/ThemeContext.js';
import type { CompleteCustomCommand } from '@nuvin/nuvin-core';
import { AppModal } from '@/components/AppModal.js';
import { HelpText } from '@/components/HelpText.js';
import { useCommandModalState } from './useCommandModalState.js';
import { useCommandModalKeyboard } from './useCommandModalKeyboard.js';
import { CommandList } from './CommandList.js';
import { CommandDetails } from './CommandDetails.js';

interface CommandModalProps {
  visible: boolean;
  commands: CompleteCustomCommand[];
  activeProfile?: string;
  initialSelectedIndex?: number;
  onClose: () => void;
  onCreate?: () => void;
  onEdit?: (commandId: string) => void;
  onDelete?: (commandId: string) => void;
  getShadowedCommands: (commandId: string) => CompleteCustomCommand[];
}

export const CommandModal: React.FC<CommandModalProps> = ({
  visible,
  commands,
  activeProfile,
  initialSelectedIndex,
  onClose,
  onCreate,
  onEdit,
  onDelete,
  getShadowedCommands,
}) => {
  const { theme } = useTheme();

  const state = useCommandModalState(commands, initialSelectedIndex);

  useCommandModalKeyboard({
    visible,
    commands,
    state,
    onClose,
    onCreate,
    onEdit,
    onDelete,
  });

  if (!visible) return null;

  const currentCommand = commands[state.selectedIndex];
  const shadowedCommands = currentCommand ? getShadowedCommands(currentCommand.id) : [];

  const title = activeProfile && activeProfile !== 'default'
    ? `Custom Commands (Profile: ${activeProfile})`
    : 'Custom Commands';

  return (
    <AppModal
      visible={visible}
      title={title}
      onClose={undefined}
      closeOnEscape={false}
      paddingX={2}
      paddingY={1}
    >
      <Box marginBottom={1} flexDirection="column">
        <Text color={theme.history.help} dimColor>
          ↑↓ navigate • ESC exit
        </Text>
        <Box>
          <HelpText
            segments={[
              { text: 'N', highlight: true },
              { text: ' new • ' },
              { text: 'E', highlight: true },
              { text: ' edit • ' },
              { text: 'X', highlight: true },
              { text: ' delete' },
            ]}
          />
        </Box>
        <Box marginTop={1}>
          <Text color={theme.history.help} dimColor>
            [G] Global • [P] Profile • [L] Local
          </Text>
        </Box>
      </Box>

      {commands.length === 0 ? (
        <Box marginTop={1}>
          <Text color={theme.history.help}>
            No custom commands found. Press N to create a new command.
          </Text>
        </Box>
      ) : (
        <Box flexDirection="row">
          <CommandList
            commands={commands}
            selectedIndex={state.selectedIndex}
          />

          <CommandDetails
            command={currentCommand}
            shadowedCommands={shadowedCommands}
            activeProfile={activeProfile}
          />
        </Box>
      )}
    </AppModal>
  );
};

export default CommandModal;
