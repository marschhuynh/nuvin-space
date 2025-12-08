import { Box, Text } from 'ink';
import { useTheme } from '@/contexts/ThemeContext.js';
import Gradient from 'ink-gradient';
import { useStdoutDimensions } from '@/hooks/useStdoutDimensions.js';
import type { SessionInfo } from '@/types.js';
import { getVersion } from '@/utils/version';

type RecentSessionsProps = {
  recentSessions: SessionInfo[];
};

const formatRelativeTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 5) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) {
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return diffInHours < 6 ? `${diffInHours}h ago` : `Today ${timeStr}`;
  }
  if (diffInDays === 1) {
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `Yesterday ${timeStr}`;
  }
  if (diffInDays < 7) {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `${dayName} ${timeStr}`;
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const getMessageCountBadge = (count: number) => {
  if (count === 1) return { text: '1 msg', color: 'gray' };
  if (count < 10) return { text: `${count} msgs`, color: 'cyan' };
  if (count < 50) return { text: `${count} msgs`, color: 'green' };
  return { text: `${count} msgs`, color: 'magenta' };
};

const version = getVersion();
const ICON_2 = `╭──┴──┴──┴──┴──┴──╮
│  ●  ●  ● ─────  │
│  NUVIN          │
│  >_     ${version.padEnd(7, ' ')} │
╰──┬──┬──┬──┬──┬──╯`;

const WelcomeLogo = ({ recentSessions }: { recentSessions: SessionInfo[] }) => {
  const [cols, _rows] = useStdoutDimensions();

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
  const [cols, _rows] = useStdoutDimensions();

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
