import type { ReactNode, FC } from 'react';
import { Box, Text } from 'ink';
import { useInput } from '@/contexts/InputContext/index.js';
import { theme as globalTheme } from '@/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useStdoutDimensions } from '@/hooks';

export type AppModalType = 'info' | 'error' | 'warning' | 'success' | 'default';

interface ModalTheme {
  borderColor: string;
  titleColor: string;
}

const MODAL_THEMES: Record<AppModalType, ModalTheme> = {
  info: {
    borderColor: 'cyan',
    titleColor: 'cyan',
  },
  error: {
    borderColor: 'red',
    titleColor: 'red',
  },
  warning: {
    borderColor: 'yellow',
    titleColor: 'yellow',
  },
  success: {
    borderColor: 'green',
    titleColor: 'green',
  },
  default: {
    borderColor: 'white',
    titleColor: globalTheme.colors.accent,
  },
};

export interface AppModalProps {
  visible: boolean;
  title?: string;
  rightTitle?: string | ReactNode;
  footer?: string | ReactNode;
  type?: AppModalType;
  titleColor?: string;
  borderColor?: string;
  children: ReactNode;
  onClose?: () => void;
  closeOnEscape?: boolean;
  closeOnEnter?: boolean;
  paddingX?: number;
  paddingY?: number;
  marginX?: number;
  marginY?: number;
  height?: number;
}

export const AppModal: FC<AppModalProps> = ({
  visible,
  title,
  rightTitle,
  type = 'default',
  titleColor,
  borderColor,
  children,
  onClose,
  closeOnEscape = true,
  closeOnEnter = false,
  paddingX = 2,
  paddingY = 0,
  marginX = 1,
  marginY = 0,
  height,
  footer,
}) => {
  const [cols] = useStdoutDimensions();
  const { theme: globalTheme } = useTheme();
  const theme = MODAL_THEMES[type];
  const finalBorderColor = borderColor || theme.borderColor;
  const finalTitleColor = titleColor || theme.titleColor;

  useInput(
    (_input, key) => {
      if (key.escape && closeOnEscape && onClose) {
        onClose();
        return;
      }
      if (key.return && closeOnEnter && onClose) {
        onClose();
        return;
      }
    },
    { isActive: visible && !!onClose },
  );

  if (!visible) return null;

  return (
    <Box height={height} flexDirection="column" borderStyle="round" borderColor={finalBorderColor} width={cols}>
      <Box
        flexWrap="wrap"
        borderStyle="single"
        borderLeft={false}
        borderRight={false}
        borderTop={false}
        borderColor={'gray'}
        justifyContent="space-between"
      >
        {title ? (
          <Text color={finalTitleColor} bold>
            {` + ${title}`}
          </Text>
        ) : null}

        {rightTitle ? (
          <Box alignItems="flex-end" alignSelf="flex-end" justifyContent="flex-end" flexGrow={1}>
            <Text color={finalTitleColor} bold>
              {rightTitle}{' '}
            </Text>
          </Box>
        ) : null}
      </Box>
      <Box flexDirection="column" width={'100%'}>
        <Box
          flexDirection="column"
          width={'100%'}
          paddingX={paddingX}
          paddingY={paddingY}
          marginX={marginX}
          marginY={marginY}
        >
          {children}
        </Box>
        {footer ? (
          <Box
            flexGrow={1}
            borderStyle="single"
            borderLeft={false}
            borderRight={false}
            borderBottom={false}
            borderColor={globalTheme.tokens.gray}
          >
            {footer}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
};

export default AppModal;
