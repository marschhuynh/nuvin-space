import type React from 'react';
import { Box, Text } from 'ink';
import { useStdoutDimensions } from '@/hooks/index.js';
import type { ToolParamRendererProps } from './types.js';

/**
 * FileEditParamRender - Parameter renderer for file_edit tool calls
 *
 * Filters out old_text and new_text parameters to avoid showing verbose content differences.
 * Only shows relevant parameters like file_path.
 */
export const FileEditParamRender: React.FC<ToolParamRendererProps> = ({
  args,
  statusColor,
  formatValue,
}: ToolParamRendererProps) => {
  const [cols] = useStdoutDimensions();
  const filteredArgs = Object.fromEntries(
    Object.entries(args).filter(([key]) => key !== 'old_text' && key !== 'new_text' && key !== 'description'),
  );

  if (Object.keys(filteredArgs).length === 0) {
    return null;
  }

  return (
    <Box
      flexWrap="wrap"
      marginLeft={2}
      borderStyle="single"
      borderDimColor
      borderColor={statusColor}
      borderBottom={false}
      borderRight={false}
      borderTop={false}
      paddingLeft={2}
      width={cols - 6}
    >
      {Object.entries(filteredArgs).map(([key, value]) => (
        <Text key={key} dimColor>{`${key}: ${formatValue(value)}`}</Text>
      ))}
    </Box>
  );
};
