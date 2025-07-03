import { Button } from "@/components/ui/button";
import { Plus, History } from 'lucide-react';
import { ConversationItem } from './ConversationItem';
import { Conversation } from '@/types';

interface ConversationHistoryProps {
  conversations: Conversation[];
  onNewConversation?: () => void;
  onConversationSelect?: (conversationId: number) => void;
}

export function ConversationHistory({
  conversations,
  onNewConversation,
  onConversationSelect
}: ConversationHistoryProps) {
  return (
    <div className="w-80 border-r border-border bg-card">
      <div className="mx-2 mt-4">
        <Button
          className="w-full p-2 h-auto flex items-center justify-center gap-2"
          size="sm"
          onClick={onNewConversation}
        >
          <Plus className="h-4 w-4" />
          New Conversation
        </Button>
      </div>
      <div className="overflow-y-auto mt-4">
        {conversations.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            onClick={onConversationSelect}
          />
        ))}
      </div>
    </div>
  );
}