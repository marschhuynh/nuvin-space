/**
 * Centralized formatting utilities for the Nuvin CLI
 * All time, token, cost and display formatting functions in one place
 */

import os from 'node:os';
import { execSync } from 'node:child_process';
import type { Theme } from '@/theme.js';

/**
 * Format token counts with appropriate suffixes
 */
export const formatTokens = (tokens: number | null | undefined): string => {
  if (tokens == null) return '-';
  if (tokens >= 1000000000) return `${(tokens / 1000000000).toFixed(2)}B`;
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(2)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
  return tokens.toString();
};

/**
 * Format cost with appropriate decimal precision
 */
export const formatCost = (cost: number): string => {
  if (cost === 0) return '0.00';
  if (cost < 0.01) return cost.toFixed(4);
  if (cost < 1) return cost.toFixed(3);
  return cost.toFixed(2);
};

/**
 * Format directory paths, replacing home directory with ~
 */
export const formatDirectory = (dir: string): string => {
  const home = os.homedir();
  return dir.replace(home, '~');
};

/**
 * Format duration in milliseconds to appropriate string
 */
export const formatDuration = (durationMs: number | null | undefined): string | null => {
  if (durationMs == null || !Number.isFinite(durationMs)) return null;

  if (durationMs < 1000) {
    return `${durationMs}ms`;
  } else if (durationMs < 60000) {
    return `${(durationMs / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(durationMs / 60000);
    const seconds = ((durationMs % 60000) / 1000).toFixed(0);
    return `${minutes}m${seconds ? ` ${seconds}s` : ''}`;
  }
};

/**
 * Format timestamp into relative time string
 */
export const formatRelativeTime = (timestamp: string): string => {
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

/**
 * Format time in seconds (for ToolTimer compatibility)
 */
export const formatTimeFromSeconds = (seconds: number): string => {
  return `${seconds.toFixed(0)}s`;
};

/**
 * Get usage color based on percentage (moved from Footer.tsx)
 */
export const getUsageColor = (usage: number, theme: Theme): string => {
  if (usage >= 0.95) return theme.tokens.red;
  if (usage >= 0.85) return theme.tokens.yellow;
  return theme.footer.model;
};

const gitBranchCache = new Map<string, { value: string | null; timestamp: number }>();
const GIT_BRANCH_CACHE_TTL = 5000;

/**
 * Get git branch for a directory (moved from Footer.tsx)
 * Results are cached for 5 seconds to avoid repeated execSync calls
 */
export const getGitBranch = (dir: string): string | null => {
  const cached = gitBranchCache.get(dir);
  if (cached && Date.now() - cached.timestamp < GIT_BRANCH_CACHE_TTL) {
    return cached.value;
  }

  try {
    const result = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    gitBranchCache.set(dir, { value: result, timestamp: Date.now() });
    return result;
  } catch {
    gitBranchCache.set(dir, { value: null, timestamp: Date.now() });
    return null;
  }
};

/**
 * Format message count with badge text and color
 */
export const getMessageCountBadge = (count: number): { text: string; color: string } => {
  if (count === 1) return { text: '1 msg', color: 'gray' };
  if (count < 10) return { text: `${count} msgs`, color: 'cyan' };
  if (count < 50) return { text: `${count} msgs`, color: 'green' };
  return { text: `${count} msgs`, color: 'magenta' };
};
