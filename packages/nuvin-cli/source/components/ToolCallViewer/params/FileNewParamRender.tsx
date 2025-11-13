import type React from 'react';
import { Box, Text } from 'ink';
import type { ToolParamRendererProps } from './types.js';

/**
 * FileNewParamRender - Parameter renderer for file_new tool calls
 *
 * Excludes the content parameter from display to avoid verbose output.
 * Shows file_path and other relevant parameters only.
 */
export const FileNewParamRender: React.FC<ToolParamRendererProps> = ({
  args,
  statusColor,
  formatValue,
  fullMode = false,
}: ToolParamRendererProps) => {
  const { content: _content, description: _description, ...displayArgs } = args;

  if (Object.keys(displayArgs).length === 0) {
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
      {Object.entries(displayArgs).map(([key, value]) => (
        <Box key={key} flexDirection="row">
          <Text dimColor>{key}: </Text>
          <Text dimColor>{format(value)}</Text>
        </Box>
      ))}
    </Box>
  );
};
