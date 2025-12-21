import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Box, Text, useInput } from 'ink';
import type { MemoryPort, Message } from '@nuvin/nuvin-core';
import Spinner from 'ink-spinner';
import { useTheme } from '@/contexts/ThemeContext.js';
import { useStdoutDimensions } from '@/hooks/useStdoutDimensions.js';
import { useInputHistory } from '@/hooks/useInputHistory.js';
import TextInput from './TextInput/index.js';
import { ComboBox } from './ComboBox/index.js';

type VimMode = 'insert' | 'normal';

export type InputAreaHandle = {
  clear: () => void;
  getValue: () => string;
  setValue: (value: string) => void;
  setValueForRecall: (value: string) => void;
  appendValue: (text: string) => void;
  closeMenu: () => void;
};

type InputAreaProps = {
  busy: boolean;
  messageQueueLength: number;
  showToolApproval?: boolean;
  focus?: boolean;
  useAbsoluteMenu?: boolean;

  commandItems: Array<{ label: string; value: string }>;
  vimModeEnabled?: boolean;
  memory?: MemoryPort<Message> | null;

  onInputChanged?: (value: string) => void;
  onInputSubmit?: (value: string) => Promise<void>;
  onVimModeToggle?: () => void;
  onVimModeChanged?: (mode: 'insert' | 'normal') => void;
};

const InputAreaComponent = forwardRef<InputAreaHandle, InputAreaProps>(
  (
    {
      busy,
      showToolApproval = false,
      focus = true,
      useAbsoluteMenu: _useAbsoluteMenu = false,

      commandItems,
      vimModeEnabled = false,
      memory,

      onInputChanged,
      onInputSubmit,
      onVimModeChanged,
    },
    ref,
  ) => {
    const { theme } = useTheme();
    const [input, setInput] = useState('');
    const [showCommandMenu, setShowCommandMenu] = useState(false);
    const [focusKey, setFocusKey] = useState(0);
    const [menuHasFocus, setMenuHasFocus] = useState(false);
    const [_vimMode, setVimMode] = useState<VimMode>('insert');
    const [cols] = useStdoutDimensions();

    const onRecall = useCallback(
      (message: string) => {
        setInput(message);
        setFocusKey((prev) => prev + 1);
        onInputChanged?.(message);
      },
      [onInputChanged],
    );

    const { handleUpArrow, handleDownArrow, addMessage } = useInputHistory({
      memory,
      currentInput: input,
      onRecall,
    });

    const setMenuVisibility = useCallback((visible: boolean) => {
      setShowCommandMenu(visible);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        clear: () => {
          setInput('');
          setMenuVisibility(false);
          setFocusKey((prev) => prev + 1);
          if (onInputChanged) {
            onInputChanged('');
          }
        },
        getValue: () => input,
        setValue: (value: string) => {
          setInput(value);
          if (onInputChanged) {
            onInputChanged(value);
          }
        },
        setValueForRecall: (value: string) => {
          setInput(value);
          setFocusKey((prev) => prev + 1);
          if (onInputChanged) {
            onInputChanged(value);
          }
        },
        appendValue: (text: string) => {
          setInput((current) => {
            const newValue = current + text;
            if (onInputChanged) {
              onInputChanged(newValue);
            }
            return newValue;
          });
          setFocusKey((prev) => prev + 1);
        },
        closeMenu: () => {
          setMenuVisibility(false);
        },
      }),
      [setMenuVisibility, onInputChanged, input],
    );

    const filteredCommandItems = commandItems.filter((item) => {
      const inputParts = input.split(/\s+/);
      const commandPart = inputParts[0];

      return (
        item.value.toLowerCase().includes(commandPart.toLowerCase()) ||
        item.label.toLowerCase().includes(commandPart.toLowerCase())
      );
    });

    useEffect(() => {
      if (vimModeEnabled) {
        setVimMode('normal');
      } else {
        setVimMode('insert');
      }
    }, [vimModeEnabled]);

    const handleChange = (value: string) => {
      setInput(value);
      const shouldShowMenu = value.startsWith('/');
      setMenuVisibility(shouldShowMenu);

      if (onInputChanged) {
        onInputChanged(value);
      }

      if (!shouldShowMenu) {
        setMenuHasFocus(false);
      }
    };

    const handleTabCompletion = useCallback(() => {
      if (!input.startsWith('/')) return;

      const inputParts = input.split(/\s+/);
      const commandPart = inputParts[0];
      const args = inputParts.slice(1).join(' ');

      const matches = commandItems.filter((item) => item.value.toLowerCase().startsWith(commandPart.toLowerCase()));

      if (matches.length > 0) {
        const completed = args ? `${matches[0].value} ${args}` : matches[0].value;
        setInput(completed);
        setMenuVisibility(true);
        setFocusKey((prev) => prev + 1);
        onInputChanged?.(completed);
      }
    }, [input, commandItems, setMenuVisibility, onInputChanged]);

    useInput(
      (_input, key) => {
        if (!showCommandMenu || filteredCommandItems.length === 0) {
          return;
        }

        if (key.tab) {
          if (input.startsWith('/') && !menuHasFocus) {
            handleTabCompletion();
            return;
          }

          setMenuHasFocus((prev) => !prev);
          setFocusKey((prev) => prev + 1);
          return;
        }

        if (key.upArrow || key.downArrow) {
          if (!menuHasFocus) {
            setMenuHasFocus(true);
          }
          return;
        }

        if (key.escape) {
          if (menuHasFocus) {
            setMenuHasFocus(false);
            setFocusKey((prev) => prev + 1);
          } else {
            setMenuVisibility(false);
          }
          return;
        }
      },
      { isActive: showCommandMenu && filteredCommandItems.length > 0 },
    );

    const handleVimModeChange = useCallback(
      (mode: VimMode) => {
        setVimMode(mode);
        if (onVimModeChanged) {
          onVimModeChanged(mode);
        }
      },
      [onVimModeChanged],
    );

    const handleSubmit = async (value: string, fromCommandMenu?: boolean) => {
      if (fromCommandMenu && !menuHasFocus) {
        return;
      }

      const trimmed = value.trim();

      if (trimmed.startsWith('/')) {
        const inputParts = trimmed.split(/\s+/);
        const commandPart = inputParts[0];
        const args = inputParts.slice(1).join(' ').trim();
        const commandMatch = commandItems.find((item) => item.value === commandPart);

        if (commandMatch) {
          setInput('');
          setMenuVisibility(false);
          setMenuHasFocus(false);
          onInputChanged?.('');
          await onInputSubmit?.(trimmed);
          return;
        }

        if (showCommandMenu) {
          if (filteredCommandItems.length > 0) {
            const first = filteredCommandItems[0];
            const completed = args ? `${first.value} ${args}` : first.value;
            setInput('');
            setMenuVisibility(false);
            setMenuHasFocus(false);
            onInputChanged?.('');
            await onInputSubmit?.(completed);
          }
          return;
        }
      }

      if (trimmed && !trimmed.startsWith('/')) {
        addMessage(trimmed);
      }

      setInput('');
      setMenuVisibility(false);
      setMenuHasFocus(false);
      onInputChanged?.('');
      await onInputSubmit?.(value);
    };

    const commandMenu = showCommandMenu && filteredCommandItems.length > 0 && (
      <Box flexDirection="column">
        <Box backgroundColor={theme.colors.accent}>
          <Text color={theme.colors.accent} bold>
            {' '}
            Commands ({filteredCommandItems.length}) - Use ↑↓ to navigate, Enter to select
          </Text>
        </Box>
        <ComboBox
          items={filteredCommandItems}
          onSelect={(item) => handleSubmit(item.value, true)}
          showSearchInput={false}
          showItemCount={false}
        />
      </Box>
    );

    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderBottomDimColor
        borderTop={false}
        borderBottom
        borderLeft={false}
        borderRight={false}
      >
        {commandMenu}
        <Box flexShrink={0} minWidth={1}>
          {!busy ? (
            <Text color={theme.input.prompt} bold>
              {'❯'}
            </Text>
          ) : (
            <Spinner type="dots" />
          )}
          <Box minWidth={1} />
          <Box width={cols - 2}>
            <TextInput
              key={focusKey}
              value={input}
              onChange={handleChange}
              onSubmit={handleSubmit}
              placeholder="Type your message..."
              focus={focus && !showToolApproval && !menuHasFocus}
              vimModeEnabled={vimModeEnabled}
              onVimModeChange={handleVimModeChange}
              onUpArrow={showCommandMenu ? undefined : handleUpArrow}
              onDownArrow={showCommandMenu ? undefined : handleDownArrow}
            />
          </Box>
        </Box>
      </Box>
    );
  },
);

export const InputArea = React.memo(InputAreaComponent);
