import type React from 'react';
import { Box, type BoxProps, Text } from 'ink';
import { useTheme } from '@/contexts/ThemeContext.js';
import { AppModal } from '@/components/AppModal.js';
import TextInput from '@/components/TextInput/index.js';
import { ToolSelectInput } from './ToolSelectInput.js';
import type { AgentTemplate } from '@nuvin/nuvin-core';
import { useStdoutDimensions } from '@/hooks/useStdoutDimensions.js';
import { FocusProvider } from '@/contexts/InputContext/FocusContext.js';
import { HelpText } from '@/components/HelpText.js';
import { AutoScrollBox } from '@/components/AutoScrollBox.js';
import { Focusable } from '@/components/Focusable/index.js';

interface AgentFormProps {
  mode: 'create' | 'edit';
  preview: Partial<AgentTemplate> & { systemPrompt: string };
  availableTools: string[];
  editedName: string;
  editedId: string;
  editedDescription: string;
  editedTools: string[];
  editedTemperature: string;
  editedSystemPrompt: string;
  editedModel: string;
  error?: string;
  onFieldChange: (field: string, value: string) => void;
  onToolsChange: (tools: string[]) => void;
}

const ResponsiveBox: React.FC<BoxProps & { children: React.ReactNode }> = ({ children, ...rest }) => {
  const { cols } = useStdoutDimensions();

  return (
    <Box flexDirection={cols < 80 ? 'column' : 'row'} gap={2} {...rest}>
      {children}
    </Box>
  );
};

const FormTextInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}> = ({ label, value, onChange, autoFocus }) => {
  const { theme } = useTheme();
  return (
    <Focusable autoFocus={autoFocus}>
      {({ isFocused }) => (
        <Box flexDirection="column">
          <Text color={isFocused ? theme.colors.accent : theme.modal.help} bold={isFocused} dimColor={!isFocused}>
            {label}
          </Text>
          <TextInput value={value} onChange={onChange} focus={isFocused} />
        </Box>
      )}
    </Focusable>
  );
};

const AgentFormContent: React.FC<AgentFormProps> = ({
  mode,
  preview,
  availableTools,
  editedName,
  editedId,
  editedDescription,
  editedTools,
  editedTemperature,
  editedModel,
  error,
  onFieldChange,
  onToolsChange,
}) => {
  const { cols } = useStdoutDimensions();
  const { theme } = useTheme();

  const editingTitle = mode === 'edit' ? 'Edit Agent' : 'Edit Generated Agent';

  return (
    <AppModal visible={true} title={editingTitle} titleColor={theme.colors.primary}>
      <Box flexDirection="column" marginTop={1}>
        {error ? (
          <Box marginBottom={1}>
            <Text color={theme.colors.error}>{error}</Text>
          </Box>
        ) : null}

        <Box marginBottom={1}>
          <Text color={theme.colors.primary} bold>
            {preview.name || 'Custom Agent'}
          </Text>
        </Box>

        <ResponsiveBox marginBottom={1} gap={2}>
          <Box flexGrow={1} width={cols / 4}>
            <FormTextInput
              label="Name:"
              value={editedName}
              onChange={(value) => onFieldChange('name', value)}
              autoFocus
            />
          </Box>

          <Box flexGrow={1} width={cols / 4}>
            <FormTextInput
              label={`ID${mode === 'edit' ? '' : ' (auto-gen)'}:`}
              value={editedId}
              onChange={(value) => onFieldChange('id', value)}
            />
          </Box>

          <Box flexGrow={1} width={cols / 4}>
            <FormTextInput label="Model:" value={editedModel} onChange={(value) => onFieldChange('model', value)} />
          </Box>

          <Box flexGrow={1} width={cols / 4}>
            <FormTextInput
              label="Temp (0-2):"
              value={editedTemperature}
              onChange={(value) => onFieldChange('temperature', value)}
            />
          </Box>
        </ResponsiveBox>

        <Box flexDirection="column" marginBottom={1}>
          <ToolSelectInput availableTools={availableTools} selectedTools={editedTools} onChange={onToolsChange} />
        </Box>

        <Box marginBottom={1}>
          <FormTextInput
            label="Description:"
            value={editedDescription}
            onChange={(value) => onFieldChange('description', value)}
          />
        </Box>

        <Focusable>
          {({ isFocused }) => (
            <Box flexDirection="column" marginBottom={1}>
              <Text color={isFocused ? theme.colors.accent : theme.modal.help} bold={isFocused} dimColor={!isFocused}>
                System Prompt:
              </Text>
              <AutoScrollBox maxHeight={14} enableMouseScroll={false} focus={isFocused} manualFocus>
                <Text color={theme.modal.subtitle}>{preview.systemPrompt}</Text>
              </AutoScrollBox>
            </Box>
          )}
        </Focusable>

        <Box marginTop={1}>
          <HelpText
            segments={[
              { text: 'Tab', highlight: true },
              { text: ' to cycle fields, ' },
              { text: 'Ctrl+S', highlight: true },
              { text: ' to save. ' },
              { text: 'ESC', highlight: true },
              { text: mode === 'edit' ? ' cancels editing.' : ' returns to the preview.' },
            ]}
          />
        </Box>
      </Box>
    </AppModal>
  );
};

export const AgentForm: React.FC<AgentFormProps> = (props) => {
  return (
    <FocusProvider>
      <AgentFormContent {...props} />
    </FocusProvider>
  );
};
