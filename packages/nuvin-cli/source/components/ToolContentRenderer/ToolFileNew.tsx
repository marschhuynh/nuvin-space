import { useMemo } from 'react';
import type { ToolCall } from '@nuvin/nuvin-core';
import { Box, Text } from 'ink';
import { useStdoutDimensions } from '@/hooks';

type FileNewArgs = {
  file_path: string;
  content: string;
};

function parseArgs(call: ToolCall): FileNewArgs | null {
  try {
    return call.function.arguments ? (JSON.parse(call.function.arguments) as FileNewArgs) : null;
  } catch {
    return null;
  }
}

function addLineNumbers(content: string): Array<{ lineNumber: string; content: string }> {
  if (!content) return [];

  const lines = content.split('\n');
  const maxLineNumber = lines.length;
  const lineNumberWidth = maxLineNumber.toString().length;

  return lines.map((line, index) => {
    const lineNumber = (index + 1).toString().padStart(lineNumberWidth, ' ');
    return {
      lineNumber: `${lineNumber} │ `,
      content: line.replace(/\t/g, '  '),
    };
  });
}

export function FileNewToolContent({ call }: { call: ToolCall }) {
  const args = useMemo(() => parseArgs(call), [call]);
  const [width] = useStdoutDimensions();

  if (!args)
    return (
      <Box marginTop={1}>
        <Text color="red">Invalid arguments</Text>
      </Box>
    );

  const linesWithNumbers = addLineNumbers(args.content);

  return (
    <Box flexDirection="column" marginTop={1} width={width - 10} overflow="hidden">
      {linesWithNumbers.map((line) => (
        <Box key={`${line.lineNumber}-${line.content.slice(0, 20)}`}>
          <Text dimColor>{line.lineNumber}</Text>
          <Text>{line.content}</Text>
        </Box>
      ))}
    </Box>
  );
}
