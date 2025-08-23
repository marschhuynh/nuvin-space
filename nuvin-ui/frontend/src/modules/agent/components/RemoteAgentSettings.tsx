import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X, AlertTriangle, Loader2, Wifi, WifiOff } from 'lucide-react';

interface RemoteAgentSettingsProps {
  url: string;
  isEditing: boolean;
  isTestingConnection: boolean;
  connectionStatus: 'idle' | 'success' | 'error' | 'warning';
  onUrlChange: (url: string) => void;
  onTestConnection: () => void;
}

export function RemoteAgentSettings({
  url,
  isEditing,
  isTestingConnection,
  connectionStatus,
  onUrlChange,
  onTestConnection,
}: RemoteAgentSettingsProps) {
  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'success':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'error':
        return <X className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return isTestingConnection ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : url.trim() ? (
          <Wifi className="h-4 w-4 text-gray-400" />
        ) : (
          <WifiOff className="h-4 w-4 text-gray-300" />
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="agentUrl">Agent URL</Label>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onTestConnection}
            disabled={!url.trim() || isTestingConnection}
            className="h-6 w-6"
          >
            {getConnectionIcon()}
          </Button>
        </div>
        {isEditing ? (
          <>
            <Input
              id="agentUrl"
              value={url}
              onChange={(e) => {
                onUrlChange(e.target.value);
              }}
              placeholder="https://example.com/agent"
              className="h-9"
            />
            <p className="text-xs text-muted-foreground">The base URL of the A2A agent</p>
          </>
        ) : (
          <div className="px-3 py-2 border rounded-md bg-background text-sm font-mono break-all select-all h-9 flex items-center">
            {url || 'No URL configured'}
          </div>
        )}
      </div>

      {/* Placeholder for remote agent alignment */}
      <div className="grid gap-2">
        <Label>Remote Configuration</Label>
        <div className="px-3 py-2 border rounded-md bg-muted/50 text-sm text-muted-foreground h-9 flex items-center">
          Configure URL and authentication below
        </div>
      </div>
    </div>
  );
}
