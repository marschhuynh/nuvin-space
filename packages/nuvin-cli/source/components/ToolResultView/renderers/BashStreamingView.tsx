import type React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '@/contexts/ThemeContext.js';
import { LatestView } from '@/components/LatestView.js';
import type { BashStreamingState } from '@/utils/eventProcessor.js';
import { LAYOUT } from './constants.js';

type BashStreamingViewProps = {
  streamingState: BashStreamingState;
  toolCallId: string;
  cols: number;
};

export const BashStreamingView: React.FC<BashStreamingViewProps> = ({
  streamingState,
  cols,
}) => {
  const { theme } = useTheme();

  const combinedOutput = streamingState.stdout + streamingState.stderr;
  const lines = combinedOutput.split('\n').filter((l) => l.length > 0);

  if (lines.length === 0) {
    return (
      <Box marginLeft={2} flexDirection="column" width={cols - LAYOUT.CONTENT_MARGIN}>
        <Box>
          <Text color={theme.tokens.blue}>◐ </Text>
          <Text color={theme.tokens.gray}>Waiting for output...</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width={cols - LAYOUT.CONTENT_MARGIN}>
      <Box marginBottom={1}>
        <Text color={theme.tokens.blue}>◐ Streaming output ({lines.length} lines)</Text>
      </Box>

      <LatestView
        height={8}
        maxLines={20}
        borderColor={theme.tokens.blue}
      >
        {combinedOutput}
      </LatestView>

      <Box marginTop={1}>
        <Text color={theme.tokens.gray}>
          Live • {lines.length} lines received
        </Text>
      </Box>
    </Box>
  );
};
