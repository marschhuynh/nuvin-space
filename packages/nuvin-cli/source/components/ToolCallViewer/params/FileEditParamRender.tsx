import type React from 'react';
import { Box, Text } from 'ink';
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
  fullMode = false,
}: ToolParamRendererProps) => {
  const filteredArgs = Object.fromEntries(
    Object.entries(args).filter(([key]) => key !== 'old_text' && key !== 'new_text' && key !== 'description'),
  );

  if (Object.keys(filteredArgs).length === 0) {
    return null;
  }

  const format = (value: unknown): string => {
    if (!fullMode) return formatValue(value);
    
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <Box
      flexDirection="column"
      marginLeft={2}
      borderStyle="single"
      borderDimColor
      borderColor={statusColor}
      borderBottom={false}
      borderRight={false}
      borderTop={false}
      paddingLeft={2}
    >
      {Object.entries(filteredArgs).map(([key, value]) => (
        <Box key={key} flexDirection="row">
          <Text dimColor>{key}: </Text>
          <Text dimColor>{format(value)}</Text>
        </Box>
      ))}
    </Box>
  );
};
