import { Conversation } from '@/types';

interface ConversationItemProps {
  conversation: Conversation;
  onClick?: (conversationId: number) => void;
}

export function ConversationItem({ conversation, onClick }: ConversationItemProps) {
  const handleClick = () => {
    onClick?.(conversation.id);
  };

  return (
    <div
      onClick={handleClick}
      className={`relative mx-2 my-1 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
        conversation.active
          ? 'bg-gradient-to-r from-primary/15 to-primary/10 border border-primary/30 ring-1 ring-primary/20 conversation-active'
          : 'hover:bg-muted/60 hover:border-border/60 border border-transparent'
      }`}
    >
      <div className={`font-medium text-sm truncate transition-colors duration-200 ${
        conversation.active ? 'text-primary' : 'text-foreground'
      }`}>
        {conversation.title}
      </div>
      <div className={`text-xs transition-colors duration-200 ${
        conversation.active ? 'text-primary/70' : 'text-muted-foreground'
      }`}>
        {conversation.timestamp}
      </div>
      {conversation.active && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-primary rounded-full"></div>
      )}
    </div>
  );
}