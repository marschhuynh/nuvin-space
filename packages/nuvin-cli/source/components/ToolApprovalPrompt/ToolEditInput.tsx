import type React from 'react';
import { Box, Text } from 'ink';
import { useInput } from '@/contexts/InputContext/index.js';
import TextInput from '@/components/TextInput/index.js';
import { useTheme } from '@/contexts/ThemeContext.js';

type ToolEditInputProps = {
  isFocused: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

export const ToolEditInput: React.FC<ToolEditInputProps> = ({ isFocused, value, onChange, onSubmit, onCancel }) => {
  const { theme } = useTheme();

  useInput(
    (_input, key) => {
      if (key.escape) {
        onCancel();
        return;
      }
      if (key.return && value.trim().length > 0) {
        onSubmit();
        return;
      }
    },
    { isActive: isFocused },
  );

  return (
    <Box flexDirection="row" alignItems="center">
      {isFocused ? (
        <Text color={isFocused ? theme.toolApproval.actionSelected : 'transparent'} bold>
          {isFocused ? '❯ ' : ''}
        </Text>
      ) : (
        <Text color={theme.toolApproval.description} dimColor={!isFocused}>
          {'│ '}
        </Text>
      )}
      {isFocused ? (
        <TextInput
          value={value}
          onChange={onChange}
          focus={isFocused}
          placeholder="Input your changes here"
          showCursor={true}
        />
      ) : (
        <Text dimColor color={theme.toolApproval.description}>
          Input your changes here
        </Text>
      )}
    </Box>
  );
};
