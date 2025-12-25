import { forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useInput, useFocus } from '@/contexts/InputContext/index.js';
import { useTheme } from '@/contexts/ThemeContext.js';
import TextInput from '../TextInput';

export interface ToolEditInputHandle {
  focus: () => void;
}

type ToolEditInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  onFocusChange?: (focused: boolean) => void;
};

export const ToolEditInput = forwardRef<ToolEditInputHandle, ToolEditInputProps>(
  ({ value: externalValue, onSubmit, onCancel }, ref) => {
    const { theme } = useTheme();
    const { isFocused, focus } = useFocus();
    const [localValue, setLocalValue] = useState(externalValue);

    useImperativeHandle(ref, () => ({ focus }), [focus]);

    useEffect(() => {
      setLocalValue(externalValue);
    }, [externalValue]);

    useInput(
      (_input, key) => {
        if (key.escape) {
          onCancel();
          return true;
        }
        return false;
      },
      { isActive: isFocused },
    );

    return (
      <Box flexDirection="row" alignItems="flex-start">
        <Text color={isFocused ? theme.toolApproval.actionSelected : theme.toolApproval.description} bold={isFocused}>
          {isFocused ? '❯ ' : '│ '}
        </Text>
        <Box flexGrow={1}>
          <TextInput
            focus={isFocused}
            value={localValue}
            onChange={setLocalValue}
            placeholder="Input your changes here"
            onSubmit={onSubmit}
          />
        </Box>
      </Box>
    );
  },
);

ToolEditInput.displayName = 'ToolEditInput';
