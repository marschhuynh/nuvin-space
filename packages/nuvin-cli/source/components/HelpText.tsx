import type React from 'react';
import { Text } from 'ink';
import { useTheme } from '@/contexts/ThemeContext.js';

interface HelpTextSegment {
  text: string;
  highlight?: boolean;
}

interface HelpTextProps {
  segments: HelpTextSegment[];
}

export const HelpText: React.FC<HelpTextProps> = ({ segments }) => {
  const { theme } = useTheme();

  return (
    <>
      {segments.map((segment, index) => (
        <Text
          key={index}
          color={segment.highlight ? theme.colors.accent : theme.history.help}
          dimColor={!segment.highlight}
          bold={segment.highlight}
        >
          {segment.text}
        </Text>
      ))}
    </>
  );
};
