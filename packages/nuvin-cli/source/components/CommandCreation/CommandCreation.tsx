import type React from 'react';
import { useInput } from 'ink';
import type { CommandSource, CustomCommandTemplate } from '@nuvin/nuvin-core';
import { CommandForm } from './CommandForm.js';
import { useCommandCreationState } from './useCommandCreationState.js';

interface CommandCreationProps {
  visible: boolean;
  mode: 'create' | 'edit';
  initialCommand?: Partial<CustomCommandTemplate>;
  availableScopes: CommandSource[];
  activeProfile?: string;
  onSave: (command: CustomCommandTemplate) => void;
  onCancel: () => void;
}

export const CommandCreation: React.FC<CommandCreationProps> = ({
  visible,
  mode,
  initialCommand,
  availableScopes,
  activeProfile,
  onSave,
  onCancel,
}) => {
  const state = useCommandCreationState({
    mode,
    initialCommand,
    availableScopes,
  });

  useInput(
    (input, key) => {
      if (!visible) return;

      if (key.escape) {
        onCancel();
        return;
      }

      if (key.ctrl && input === 's') {
        if (state.validate()) {
          onSave(state.getCommand());
        }
        return;
      }

      if (key.tab) {
        if (key.shift) {
          state.prevField();
        } else {
          state.nextField();
        }
        return;
      }

      if (state.activeField === 'scope') {
        if (key.leftArrow) {
          state.handleScopeChange('left');
          return;
        }
        if (key.rightArrow) {
          state.handleScopeChange('right');
          return;
        }
        if (key.return) {
          state.nextField();
          return;
        }
      }
    },
    { isActive: visible },
  );

  if (!visible) return null;

  return (
    <CommandForm
      mode={mode}
      command={initialCommand || {}}
      availableScopes={availableScopes}
      activeProfile={activeProfile}
      activeField={state.activeField}
      editedName={state.editedName}
      editedDescription={state.editedDescription}
      editedScope={state.editedScope}
      editedPrompt={state.editedPrompt}
      error={state.error}
      onFieldChange={state.handleFieldChange}
      onFieldSubmit={state.handleFieldSubmit}
    />
  );
};

export default CommandCreation;
