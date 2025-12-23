import { Box, Text } from 'ink';
import { useTheme } from '@/contexts/ThemeContext.js';
import Gradient from 'ink-gradient';
import { useStdoutDimensions } from '@/hooks/useStdoutDimensions.js';
import type { SessionInfo } from '@/types.js';
import { getVersion } from '@/utils/version';
import { formatRelativeTime, getMessageCountBadge } from '@/utils/formatters.js';

type RecentSessionsProps = {
  recentSessions: SessionInfo[];
};

const version = getVersion();
const ICON_2 = `╭──┴──┴──┴──┴──┴──╮
│  ●  ●  ● ─────  │
│  NUVIN          │
│  >_     ${version.padEnd(7, ' ')} │
╰──┬──┬──┬──┬──┬──╯`;

const WelcomeLogo = ({ recentSessions }: { recentSessions: SessionInfo[] }) => {
  const { cols } = useStdoutDimensions();

  return (
    <Box flexDirection="row" padding={0} width={cols} marginTop={1} marginBottom={4}>
      <Box width={24} justifyContent="center" flexDirection="column" alignItems="center">
        <Gradient colors={['#FF5F6D', '#FFC371']}>
          <Text>{`${ICON_2}`}</Text>
        </Gradient>
      </Box>
      <Box width={cols - 24}>
        <RecentSessions recentSessions={recentSessions} />
      </Box>
    </Box>
  );
};

// Recent sessions list component
const RecentSessions = ({ recentSessions }: RecentSessionsProps) => {
  const { theme } = useTheme();
  const { cols } = useStdoutDimensions();

  return (
    <Box flexDirection="column" width={cols}>
      <Text color={theme.welcome.title} bold underline>
        Recent Sessions
      </Text>
      {recentSessions.length === 0 ? (
        <Text color={theme.welcome.subtitle} dimColor>
          No recent sessions
        </Text>
      ) : (
        recentSessions.map((session) => {
          const relativeTime = formatRelativeTime(session.timestamp);
          const displayText = (session.topic || session.lastMessage).split('\n').join(' ');
          const badge = getMessageCountBadge(session.messageCount);

          return (
            <Box key={session.sessionId} flexDirection="row" flexWrap="nowrap" width={cols - 26}>
              <Text color={theme.welcome.subtitle} dimColor wrap="truncate">
                {`${relativeTime} - ${displayText}`}
              </Text>
              <Box flexWrap="nowrap" flexShrink={0} marginLeft={1}>
                <Text color={badge.color} dimColor>
                  {badge.text}
                </Text>
              </Box>
            </Box>
          );
        })
      )}
    </Box>
  );
};

export { RecentSessions, WelcomeLogo };
