import type React from 'react';
import { Box, Text } from 'ink';
import type { ToolParamRendererProps } from './types.js';
import { useStdoutDimensions } from '@/hooks/index.js';

/**
 * DefaultParamRender - Parameter renderer for generic tool calls
 *
 * Shows all parameters without filtering.
 */
export const DefaultParamRender: React.FC<ToolParamRendererProps> = ({
  args,
  statusColor,
  formatValue,
}: ToolParamRendererProps) => {
  const [cols] = useStdoutDimensions();
  if (Object.keys(args).length === 0) {
    return null;
  }

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
      width={cols - 6}
    >
      {Object.entries(args)
        .filter(([key]) => key !== 'description')
        .map(([key, value]) => (
          <Text key={key} dimColor>{`${key}: ${formatValue(value)}`}</Text>
        ))}
    </Box>
  );
};
