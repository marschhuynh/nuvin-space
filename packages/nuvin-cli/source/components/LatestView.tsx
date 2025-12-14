import type React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '@/contexts/ThemeContext.js';

type LatestViewProps = {
  children: string;
  maxLines?: number;
  height?: number;
  focusable?: boolean;
  borderColor?: string;
  backgroundColor?: string;
};

export const LatestView: React.FC<LatestViewProps> = ({ children, maxLines = 10, height = 10 }) => {
  const { theme } = useTheme();

  const lines = children.split('\n');
  const totalLines = lines.length;

  // Always show the last maxLines lines
  const visibleStartIndex = Math.max(0, totalLines - maxLines);
  const visibleLines = lines.slice(visibleStartIndex);

  // Calculate scrollbar properties
  const scrollbarHeight = Math.max(1, Math.floor((height / totalLines) * height));
  const scrollbarPosition = 0;

  const renderScrollbar = () => {
    const scrollbarLines = [];
    for (let i = 0; i < height; i++) {
      const isThumb = i >= scrollbarPosition && i < scrollbarPosition + scrollbarHeight;
      scrollbarLines.push(
        <Text key={i} color={isThumb ? theme.tokens.white : theme.tokens.gray}>
          {isThumb ? '█' : '│'}
        </Text>,
      );
    }
    return scrollbarLines;
  };

  const renderVisibleLines = () => {
    const endIndex = Math.min(height - 2, visibleLines.length); // Account for borders

    return visibleLines.slice(0, endIndex).map((line, index) => {
      const actualIndex = index;

      return (
        <Text key={actualIndex} color={theme.tokens.white}>
          {line || ' '}
        </Text>
      );
    });
  };

  return (
    <Box flexDirection="column" height={height} minHeight={height}>
      <Box flexDirection="row" height={height - 2}>
        {/* Main content area */}
        <Box flexDirection="column" flexGrow={1}>
          {renderVisibleLines()}
        </Box>

        {/* Scrollbar */}
        <Box flexDirection="column" width={1} backgroundColor={theme.tokens.black}>
          {renderScrollbar()}
        </Box>
      </Box>
    </Box>
  );
};

export default LatestView;
