import React from 'react';
import { Box, Text } from 'ink';
import * as os from 'node:os';
import { execSync } from 'node:child_process';
import type { MetricsSnapshot } from '@/services/SessionMetricsService.js';
import type { ProviderKey } from '@/const.js';
import { useNotification } from '@/hooks/useNotification.js';
import { useTheme } from '@/contexts/ThemeContext.js';
import { THINKING_LEVELS } from '@/config/types.js';
import { useToolApproval } from '@/contexts/ToolApprovalContext.js';
import { useConfig } from '@/contexts/ConfigContext.js';
import { useExplainMode } from '@/contexts/ExplainModeContext.js';

type FooterProps = {
  status: string;
  metrics?: MetricsSnapshot;
  toolApprovalMode?: boolean;
  vimModeEnabled?: boolean;
  vimMode?: 'insert' | 'normal';
  workingDirectory?: string;
  sessionId?: string;
};

const FooterComponent: React.FC<FooterProps> = ({
  status: _status,
  metrics,
  vimModeEnabled = false,
  vimMode = 'insert',
  workingDirectory,
  sessionId,
}) => {
  const { notification } = useNotification();
  const { theme } = useTheme();
  const { toolApprovalMode } = useToolApproval();
  const { explainMode } = useExplainMode();
  const { get, getCurrentProfile } = useConfig();

  const thinking = get<string>('thinking');
  const provider = get<ProviderKey>('activeProvider');
  const model = get<string>('model');
  const currentProfile = getCurrentProfile?.();

  return (
    <Box
      justifyContent="space-between"
      flexDirection="column"
      borderStyle="round"
      borderTopDimColor
      borderTop
      borderBottom={false}
      borderLeft={false}
      borderRight={false}
    >
      <Box justifyContent="space-between" flexWrap="wrap">
        {explainMode ? (
          <Text color={theme.tokens.yellow} bold>
            Ctrl+E to toggle
          </Text>
        ) : notification ? (
          <Text color={theme.tokens.yellow}>{notification || ''}</Text>
        ) : (
          <Box alignSelf="flex-end">
            {vimModeEnabled && (
              <Text color={theme.footer.status} dimColor>
                {vimMode === 'insert' ? '-- INSERT --' : '-- NORMAL --'}
                {' | '}
              </Text>
            )}
            <Text color={theme.footer.status} dimColor>
              {[
                currentProfile && currentProfile !== 'default' ? currentProfile : null,
                `${provider}:${model}`,
                sessionId && `Session: ${sessionId}`,
                thinking && thinking !== THINKING_LEVELS.OFF ? `Thinking: ${thinking}` : '',
                !toolApprovalMode ? 'SUDO' : '',
              ]
                .filter(Boolean)
                .join(' | ')}
            </Text>
          </Box>
        )}
        {!explainMode && (metrics?.currentTokens || metrics?.totalTokens) ? (
          <Box alignSelf="flex-end" flexGrow={1} justifyContent="flex-end">
            <Text color={theme.footer.model} dimColor bold>
              Tokens:
            </Text>
            <Text color={theme.footer.model} bold>
              {' '}
              {formatTokens(metrics.currentTokens)}
            </Text>
            {metrics.contextWindowLimit && metrics.contextWindowUsage !== undefined ? (
              <Text color={getUsageColor(metrics.contextWindowUsage, theme)} dimColor>
                {' '}
                ({Math.round(metrics.contextWindowUsage * 100)}%)
              </Text>
            ) : null}
            {metrics.totalTokens > 0 && (
              <Text color={theme.footer.model} dimColor>
                {' '}
                / {formatTokens(metrics.totalTokens)}
              </Text>
            )}
            <Text color={theme.footer.model} dimColor>
              {' '}
              (↑{formatTokens(metrics.currentPromptTokens)} ↓{formatTokens(metrics.currentCompletionTokens)})
            </Text>
            {metrics.currentCachedTokens > 0 && (
              <Text color={theme.tokens.green} dimColor>
                {' '}
                | Cached: {formatTokens(metrics.currentCachedTokens)}
              </Text>
            )}
            {metrics.llmCallCount > 0 && (
              <Text color={theme.tokens.magenta} dimColor>
                {' '}
                | Req: {metrics.llmCallCount}
              </Text>
            )}
            {metrics.toolCallCount > 0 && (
              <Text color={theme.tokens.blue} dimColor>
                {' '}
                | Tools: {metrics.toolCallCount}
              </Text>
            )}
            {metrics.totalCost > 0 && (
              <Text color={theme.tokens.cyan} dimColor>
                {' '}
                | ${formatCost(metrics.totalCost)}
              </Text>
            )}
          </Box>
        ) : null}
      </Box>
      {workingDirectory && (
        <Box paddingTop={0} backgroundColor={theme.footer.infoBg} justifyContent="space-between" flexWrap="wrap">
          <Box>
            <Text color={theme.footer.currentDir}>{formatDirectory(workingDirectory)}</Text>
            <Text dimColor color={theme.footer.gitBranch}>
              {getGitBranch(workingDirectory) && `:${getGitBranch(workingDirectory)}`}
            </Text>
          </Box>
          <Box alignSelf="flex-end" flexGrow={1} justifyContent="flex-end">
            <Text dimColor>
              <Text color={theme.colors.accent}>/</Text> command{' · '}
              <Text color={theme.colors.accent}>ESC×2</Text> stop{' · '}
              <Text color={theme.colors.accent}>Ctrl+E</Text> show detail
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};

const formatTokens = (tokens: number | null | undefined): string => {
  if (tokens == null) return '-';
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
  return tokens.toString();
};

const formatCost = (cost: number): string => {
  if (cost === 0) return '0.00';
  if (cost < 0.01) return cost.toFixed(4);
  if (cost < 1) return cost.toFixed(3);
  return cost.toFixed(2);
};

const getUsageColor = (usage: number, theme: ReturnType<typeof useTheme>['theme']): string => {
  if (usage >= 0.95) return theme.tokens.red;
  if (usage >= 0.85) return theme.tokens.yellow;
  return theme.footer.model;
};

const formatDirectory = (dir: string): string => {
  const home = os.homedir();
  return dir.replace(home, '~');
};

const getGitBranch = (dir: string): string | null => {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
};

export const Footer = React.memo(FooterComponent);
