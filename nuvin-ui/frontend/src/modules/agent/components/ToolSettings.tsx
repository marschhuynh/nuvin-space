import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Wrench } from 'lucide-react';
import { toolRegistry } from '@/lib/tools';
import type { AgentToolConfig } from '@/types/tools';

interface ToolSettingsProps {
  toolConfig: AgentToolConfig;
  isEditing: boolean;
  onToolConfigChange: (config: AgentToolConfig) => void;
}

export function ToolSettings({
  toolConfig,
  isEditing,
  onToolConfigChange,
}: ToolSettingsProps) {
  const handleToolToggle = (toolName: string, enabled: boolean) => {
    const enabledTools = enabled
      ? [...toolConfig.enabledTools, toolName]
      : toolConfig.enabledTools.filter((name: string) => name !== toolName);

    onToolConfigChange({ ...toolConfig, enabledTools });
  };

  const handleMaxConcurrentChange = (maxConcurrentCalls: number) => {
    onToolConfigChange({ ...toolConfig, maxConcurrentCalls });
  };

  const handleTimeoutChange = (timeoutMs: number) => {
    onToolConfigChange({ ...toolConfig, timeoutMs });
  };

  return (
    <div className="space-y-4">
      {/* Tool Settings */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="maxConcurrentCalls">Max Concurrent Tool Calls</Label>
          {isEditing ? (
            <Input
              id="maxConcurrentCalls"
              type="number"
              min="1"
              max="10"
              value={toolConfig.maxConcurrentCalls || 3}
              onChange={(e) =>
                handleMaxConcurrentChange(parseInt(e.target.value) || 3)
              }
              className="h-9"
            />
          ) : (
            <div className="px-3 py-2 border rounded-md bg-background text-sm h-9 flex items-center">
              {toolConfig.maxConcurrentCalls || 3}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="timeoutMs">Tool Timeout (ms)</Label>
          {isEditing ? (
            <Input
              id="timeoutMs"
              type="number"
              min="1000"
              max="300000"
              step="1000"
              value={toolConfig.timeoutMs || 30000}
              onChange={(e) =>
                handleTimeoutChange(parseInt(e.target.value) || 30000)
              }
              className="h-9"
            />
          ) : (
            <div className="px-3 py-2 border rounded-md bg-background text-sm h-9 flex items-center">
              {(toolConfig.timeoutMs || 30000).toLocaleString()} ms
            </div>
          )}
        </div>
      </div>

      {/* Available Tools */}
      <div className="space-y-2">
        <Label>Available Tools</Label>
        <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2 bg-background">
          {toolRegistry.getAllTools().map((tool) => (
            <div key={tool.definition.name} className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`tool-${tool.definition.name}`}
                checked={toolConfig.enabledTools.includes(tool.definition.name)}
                onChange={(e) => {
                  if (!isEditing) return;
                  handleToolToggle(tool.definition.name, e.target.checked);
                }}
                disabled={!isEditing}
                className="h-4 w-4"
              />
              <label
                htmlFor={`tool-${tool.definition.name}`}
                className="text-sm font-medium cursor-pointer flex-1"
              >
                {tool.definition.name}
              </label>
              <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                {tool.category || 'utility'}
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Enable tools that this agent can use during conversations
        </p>
      </div>
    </div>
  );
}
