import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface AuthConfig {
  type: 'bearer' | 'apikey' | 'basic' | 'none';
  token?: string;
  username?: string;
  password?: string;
  headerName?: string;
}

interface AuthenticationSettingsProps {
  auth: AuthConfig;
  isEditing: boolean;
  onAuthChange: (auth: AuthConfig) => void;
}

export function AuthenticationSettings({
  auth,
  isEditing,
  onAuthChange,
}: AuthenticationSettingsProps) {
  const handleAuthTypeChange = (
    type: 'bearer' | 'apikey' | 'basic' | 'none',
  ) => {
    onAuthChange({ type });
  };

  const handleTokenChange = (token: string) => {
    onAuthChange({ ...auth, token });
  };

  const handleUsernameChange = (username: string) => {
    onAuthChange({ ...auth, username });
  };

  const handlePasswordChange = (password: string) => {
    onAuthChange({ ...auth, password });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="authType">Authentication Type</Label>
          {isEditing ? (
            <Select value={auth.type} onValueChange={handleAuthTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select authentication type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Authentication</SelectItem>
                <SelectItem value="bearer">Bearer Token</SelectItem>
                <SelectItem value="apikey">API Key</SelectItem>
                <SelectItem value="basic">Basic Auth</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="px-3 py-2 border rounded-md bg-background text-sm select-all h-9 flex items-center">
              {auth.type === 'none'
                ? 'No Authentication'
                : auth.type === 'bearer'
                  ? 'Bearer Token'
                  : auth.type === 'apikey'
                    ? 'API Key'
                    : auth.type === 'basic'
                      ? 'Basic Authentication'
                      : auth.type}
            </div>
          )}
        </div>

        {(auth.type === 'bearer' || auth.type === 'apikey') && (
          <div className="space-y-2">
            <Label htmlFor="authToken">
              {auth.type === 'bearer' ? 'Bearer Token' : 'API Key'}
            </Label>
            {isEditing ? (
              <Input
                id="authToken"
                type="password"
                value={auth.token || ''}
                onChange={(e) => handleTokenChange(e.target.value)}
                placeholder={
                  auth.type === 'bearer'
                    ? 'Enter bearer token'
                    : 'Enter API key'
                }
              />
            ) : (
              <div className="px-3 py-2 border rounded-md bg-background text-sm h-9 flex items-center">
                {auth.token ? '••••••••••••••••' : 'Not configured'}
              </div>
            )}
          </div>
        )}

        {auth.type === 'basic' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              {isEditing ? (
                <Input
                  id="username"
                  value={auth.username || ''}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="Enter username"
                />
              ) : (
                <div className="px-3 py-2 border rounded-md bg-background text-sm select-all h-9 flex items-center">
                  {auth.username || 'Not configured'}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              {isEditing ? (
                <Input
                  id="password"
                  type="password"
                  value={auth.password || ''}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder="Enter password"
                />
              ) : (
                <div className="px-3 py-2 border rounded-md bg-background text-sm h-9 flex items-center">
                  {auth.password ? '••••••••••••••••' : 'Not configured'}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
