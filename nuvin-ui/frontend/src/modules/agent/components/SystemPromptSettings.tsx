import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface SystemPromptSettingsProps {
  systemPrompt: string;
  agentType: 'local' | 'remote';
  isEditing: boolean;
  onSystemPromptChange: (prompt: string) => void;
}

export function SystemPromptSettings({
  systemPrompt,
  agentType,
  isEditing,
  onSystemPromptChange,
}: SystemPromptSettingsProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="grid gap-2 mb-2">
        <Label htmlFor="systemPrompt">
          {agentType === 'remote' ? 'Instructions' : 'System Prompt'}
        </Label>
      </div>
      {isEditing ? (
        <Textarea
          id="systemPrompt"
          value={systemPrompt}
          onChange={(e) => onSystemPromptChange(e.target.value)}
          placeholder={
            agentType === 'remote'
              ? 'Enter instructions for the remote agent...'
              : 'Enter system prompt...'
          }
          className="flex-1 resize-none w-full min-h-[200px]"
        />
      ) : (
        <div className="flex-1 px-3 py-2 border rounded-md bg-background text-sm leading-relaxed whitespace-pre-wrap min-h-[200px] overflow-auto select-all">
          {systemPrompt || 'No system prompt configured'}
        </div>
      )}
    </div>
  );
}
