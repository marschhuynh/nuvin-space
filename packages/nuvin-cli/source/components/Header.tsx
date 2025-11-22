import React from 'react';
import { WelcomeMessage } from './index.js';

type SessionInfo = {
  sessionId: string;
  timestamp: string;
  lastMessage: string;
  messageCount: number;
  topic?: string;
};

export const HeaderContent: React.FC<{ sessions: SessionInfo[] }> = ({ sessions }) => {
  return <WelcomeMessage recentSessions={sessions} />;
};
