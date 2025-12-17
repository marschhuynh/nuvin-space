import type React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '@/contexts/ThemeContext.js';
import { AppModal } from '@/components/AppModal.js';
import TextInput from '@/components/TextInput/index.js';
import type { CommandSource, CustomCommandTemplate } from '@nuvin/nuvin-core';

type EditingField = 'name' | 'description' | 'scope' | 'prompt';

interface CommandFormProps {
  mode: 'create' | 'edit';
  command: Partial<CustomCommandTemplate>;
  availableScopes: CommandSource[];
  activeProfile?: string;
  activeField: EditingField;
  editedName: string;
  editedDescription: string;
  editedScope: CommandSource;
  editedPrompt: string;
  error?: string;
  onFieldChange: (field: EditingField, value: string) => void;
  onFieldSubmit: (field: EditingField) => void;
}

const SCOPE_LABELS: Record<CommandSource, string> = {
  global: 'Global',
  profile: 'Profile',
  local: 'Local',
};

export const CommandForm: React.FC<CommandFormProps> = ({
  mode,
  availableScopes,
  activeProfile,
  activeField,
  editedName,
  editedDescription,
  editedScope,
  editedPrompt,
  error,
  onFieldChange,
  onFieldSubmit,
}) => {
  const { theme } = useTheme();

  const title = mode === 'edit' ? 'Edit Command' : 'Create Command';

  const getScopeLabel = (scope: CommandSource): string => {
    if (scope === 'profile' && activeProfile) {
      return `Profile (${activeProfile})`;
    }
    return SCOPE_LABELS[scope];
  };

  return (
    <AppModal visible={true} title={title} titleColor={theme.colors.primary}>
      <Box flexDirection="column" marginTop={1}>
        {error && (
          <Box marginBottom={1}>
            <Text color={theme.colors.error}>{error}</Text>
          </Box>
        )}

        <Box flexDirection="column" marginBottom={1}>
          <Text color={theme.modal.help} dimColor>
            Command Name (without /):
          </Text>
          <TextInput
            value={editedName}
            onChange={(value) => onFieldChange('name', value)}
            focus={activeField === 'name'}
            onSubmit={() => onFieldSubmit('name')}
          />
          <Text color={theme.history.help} dimColor>
            Will be available as /{editedName || 'command-name'}
          </Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text color={theme.modal.help} dimColor>
            Description:
          </Text>
          <TextInput
            value={editedDescription}
            onChange={(value) => onFieldChange('description', value)}
            focus={activeField === 'description'}
            onSubmit={() => onFieldSubmit('description')}
          />
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text color={theme.modal.help} dimColor>
            Scope:
          </Text>
          <Box flexDirection="row" gap={2}>
            {availableScopes.map((scope) => (
              <Box key={scope}>
                <Text
                  color={editedScope === scope ? theme.tokens.cyan : theme.history.unselected}
                  bold={editedScope === scope}
                >
                  {editedScope === scope ? '(●)' : '( )'} {getScopeLabel(scope)}
                </Text>
              </Box>
            ))}
          </Box>
          {activeField === 'scope' && (
            <Text color={theme.history.help} dimColor>
              Use ←/→ arrows to change scope, Enter to continue
            </Text>
          )}
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text color={theme.modal.help} dimColor>
            Prompt Template:
          </Text>
          <Box borderStyle="single" borderColor={theme.history.help} paddingX={1} minHeight={5}>
            <TextInput
              value={editedPrompt}
              onChange={(value) => onFieldChange('prompt', value)}
              focus={activeField === 'prompt'}
              onSubmit={() => onFieldSubmit('prompt')}
            />
          </Box>
          <Text color={theme.history.help} dimColor>
            Use {'{{user_prompt}}'} where user input should appear
          </Text>
        </Box>

        <Box marginTop={1}>
          <Text color="green">
            Tab/Enter to navigate fields • Ctrl+S to save • ESC to cancel
          </Text>
        </Box>
      </Box>
    </AppModal>
  );
};
