import { UserMessage } from './UserMessage';
import { AssistantMessage } from './AssistantMessage';
import { useUserPreferenceStore } from '@/store/useUserPreferenceStore';

interface MessageProps {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  isStreaming?: boolean;
}

export function Message({ role, content, isStreaming = false }: MessageProps) {
  const { preferences } = useUserPreferenceStore();
  const trimmedContent = content.trim();

  if (trimmedContent.length === 0) return null;

  return (
    <div
      className={`flex gap-4 chat-message animate-in fade-in slide-in-from-bottom-2 duration-300 group ${
        role === 'user' ? 'justify-end' : 'justify-start'
      }`}
    >
      {role === 'user' ? (
        <UserMessage
          content={content}
          isStreaming={isStreaming}
          messageMode={preferences.messageMode}
        />
      ) : (
        <AssistantMessage
          content={content}
          isStreaming={isStreaming}
          messageMode={preferences.messageMode}
        />
      )}
    </div>
  );
}
