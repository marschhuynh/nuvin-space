import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAgentStore } from '@/store/useAgentStore';

interface AgentSettingsProps {
  onAddAgent: () => void;
  onEditAgent: (agentId: string) => void;
}

export function AgentSettings({ onAddAgent, onEditAgent }: AgentSettingsProps) {
  const { agents, deleteAgent } = useAgentStore();

  return (
    <div className="flex flex-1 flex-col gap-4 min-h-0">
      <div className="flex-shrink-0">
        <Button onClick={onAddAgent} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add New Agent
        </Button>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="font-medium text-sm mb-3 flex-shrink-0">
          Existing Agents ({agents.length})
        </div>
        <div className="flex flex-col flex-1 border rounded-lg bg-muted/20 overflow-hidden">
          <div className="p-3 space-y-3 pb-6 overflow-auto">
            {agents.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No agents added yet
              </div>
            ) : (
              agents.map((agent) => (
                <div key={agent.id} className="rounded-md border p-3 space-y-2">
                  <div className="flex justify-between items-center gap-3">
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate">{agent.name}</span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {agent.persona} • {agent.responseLength} responses
                      </span>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditAgent(agent.id)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteAgent(agent.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
