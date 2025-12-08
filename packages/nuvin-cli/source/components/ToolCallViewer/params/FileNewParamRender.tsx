import type React from 'react';
import { Box, Text } from 'ink';
import type { ToolParamRendererProps } from './types.js';
import { useStdoutDimensions } from '@/hooks/index.js';

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
}: ToolParamRendererProps) => {
  const [cols] = useStdoutDimensions();
  const { content: _content, description: _description, ...displayArgs } = args;

  if (Object.keys(displayArgs).length === 0) {
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
      {Object.entries(displayArgs).map(([key, value]) => (
        <Text key={key} dimColor>{`${key}: ${formatValue(value)}`}</Text>
      ))}
    </Box>
  );
};
