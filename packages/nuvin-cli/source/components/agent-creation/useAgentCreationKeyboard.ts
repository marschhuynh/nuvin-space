import { useInput } from 'ink';
import type { AgentCreationState, AgentCreationActions } from './useAgentCreationState.js';
import type { AgentTemplate } from '@nuvin/nuvin-core';

interface UseAgentCreationKeyboardProps {
  visible: boolean;
  state: AgentCreationState;
  actions: AgentCreationActions;
  onCancel: () => void;
  onConfirm?: (nextPreview?: Partial<AgentTemplate> & { systemPrompt: string }) => void;
  loading?: boolean;
}

export const useAgentCreationKeyboard = ({
  visible,
  state,
  actions,
  onCancel,
  onConfirm,
  loading = false,
}: UseAgentCreationKeyboardProps) => {
  useInput(
    (input, key) => {
      if (!visible || loading) return;

      if (key.escape) {
        if (state.isEditing) {
          if (state.mode === 'edit') {
            onCancel();
            return;
          }
          actions.handleCancelEditing();
          return;
        }

        if (state.mode === 'create' && state.showPreview) {
          actions.setShowPreview(false);
          return;
        }

        onCancel();
        actions.setDescription('');
        actions.setShowPreview(false);
        return;
      }

      if (state.isEditing) {
        if (key.ctrl && input === 's') {
          actions.handleSaveEditing();
          onConfirm?.(actions.getUpdatedPreview());
          return;
        }

        if (key.tab && !key.shift) {
          actions.moveFocus('next');
          return;
        }

        if (key.tab && key.shift) {
          actions.moveFocus('prev');
          return;
        }

        if (state.activeField === 'tools' && (key.upArrow || key.downArrow)) {
          return;
        }

        return;
      }

      // If preview is shown, allow confirmation
      if (state.mode === 'create' && state.showPreview) {
        if (input === 'y' || input === 'Y') {
          // Confirm and save
          onConfirm?.();
          actions.setDescription('');
          actions.setShowPreview(false);
        } else if (input === 'n' || input === 'N') {
          // Enter editing mode
          actions.handleStartEditing();
        }
      }
    },
    { isActive: visible },
  );
};
