import type React from 'react';
import { Box, Text } from 'ink';
import type { ToolParamRendererProps } from './types.js';
import { useStdoutDimensions } from '@/hooks/useStdoutDimensions.js';

/**
 * DefaultParamRender - Parameter renderer for generic tool calls
 *
 * Shows all parameters without filtering.
 */
export const DefaultParamRender: React.FC<ToolParamRendererProps> = ({
  args,
  statusColor,
  formatValue,
  fullMode = false,
}: ToolParamRendererProps) => {
  const [cols] = useStdoutDimensions();
  if (Object.keys(args).length === 0) {
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
      borderColor={statusColor}
      borderBottom={false}
      borderRight={false}
      borderTop={false}
      paddingLeft={2}
      width={cols - 10}
      borderDimColor
    >
      {Object.entries(args)
        .filter(([key]) => key !== 'description')
        .map(([key, value]) => (
          <Box key={key} flexDirection="row">
            <Text dimColor>{`${key}: ${format(value)}`}</Text>
          </Box>
        ))}
    </Box>
  );
};
