import { useInput } from 'ink';
import type { CompleteCustomCommand } from '@nuvin/nuvin-core';
import type { CommandModalState } from './useCommandModalState.js';

interface UseCommandModalKeyboardProps {
  visible: boolean;
  commands: CompleteCustomCommand[];
  state: CommandModalState;
  onClose: () => void;
  onCreate?: () => void;
  onEdit?: (commandId: string) => void;
  onDelete?: (commandId: string) => void;
}

export const useCommandModalKeyboard = ({
  visible,
  commands,
  state,
  onClose,
  onCreate,
  onEdit,
  onDelete,
}: UseCommandModalKeyboardProps) => {
  useInput(
    (input, key) => {
      if (!visible) return;

      if (key.escape) {
        onClose();
        return;
      }

      if (key.upArrow) {
        state.setSelectedIndex(Math.max(0, state.selectedIndex - 1));
        return;
      }

      if (key.downArrow) {
        state.setSelectedIndex(Math.min(commands.length - 1, state.selectedIndex + 1));
        return;
      }

      if (input === 'n' || input === 'N') {
        onCreate?.();
        return;
      }

      if (input === 'e' || input === 'E') {
        const currentCommand = commands[state.selectedIndex];
        if (currentCommand) {
          onEdit?.(currentCommand.id);
        }
        return;
      }

      if (input === 'x' || input === 'X') {
        const currentCommand = commands[state.selectedIndex];
        if (currentCommand) {
          onDelete?.(currentCommand.id);
        }
        return;
      }
    },
    { isActive: visible },
  );
};
