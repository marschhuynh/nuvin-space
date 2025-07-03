import { useState } from 'react';
import { Settings, Plus } from 'lucide-react';
import { useProviderStore } from '@/store/useProviderStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  apiEndpoint: string;
  apiKey: string;
  notifications: boolean;
  autoSave: boolean;
  fontSize: 'small' | 'medium' | 'large';
}


const PROVIDER_OPTIONS = ['OpenAI', 'Anthropic', 'Cohere', 'Azure'];

export function SettingsDialog() {
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'system',
    apiEndpoint: 'https://api.example.com',
    apiKey: '',
    notifications: true,
    autoSave: true,
    fontSize: 'medium'
  });
  const { providers, addProvider, updateProvider, deleteProvider, reset } =
    useProviderStore();
  const [activeTab, setActiveTab] = useState<'general' | 'provider'>('general');
  const [newProviderName, setNewProviderName] = useState('');
  const [newProviderKey, setNewProviderKey] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editKey, setEditKey] = useState('');
  const [isAddProviderOpen, setIsAddProviderOpen] = useState(false);

  const handleSave = () => {
    // In a real app, this would save settings to storage or send to backend
    console.log('Settings saved:', settings);
    console.log('Providers:', providers);
  };

  const handleReset = () => {
    setSettings({
      theme: 'system',
      apiEndpoint: 'https://api.example.com',
      apiKey: '',
      notifications: true,
      autoSave: true,
      fontSize: 'medium'
    });
    reset();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] h-[800px] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your application preferences and settings.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="mb-4 border-b">
            <nav className="flex space-x-4">
              <button
                className={`pb-2 text-sm font-medium ${
                  activeTab === 'general' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'
                }`}
                onClick={() => setActiveTab('general')}
              >
                General
              </button>
              <button
                className={`pb-2 text-sm font-medium ${
                  activeTab === 'provider' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'
                }`}
                onClick={() => setActiveTab('provider')}
              >
                Provider
              </button>
            </nav>
          </div>

          {activeTab === 'general' && (
            <div className="grid gap-6 py-4 overflow-y-auto">
              {/* Theme Setting */}
              <div className="grid gap-2">
                <Label htmlFor="theme">Theme</Label>
                <Select
                  value={settings.theme}
                  onValueChange={(value: 'light' | 'dark' | 'system') =>
                    setSettings(prev => ({ ...prev, theme: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Font Size Setting */}
              <div className="grid gap-2">
                <Label htmlFor="fontSize">Font Size</Label>
                <Select
                  value={settings.fontSize}
                  onValueChange={(value: 'small' | 'medium' | 'large') =>
                    setSettings(prev => ({ ...prev, fontSize: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select font size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notifications Toggle */}
              <div className="flex items-center justify-between">
                <Label htmlFor="notifications" className="text-sm font-medium">
                  Enable Notifications
                </Label>
                <button
                  type="button"
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                    settings.notifications ? 'bg-primary' : 'bg-input'
                  }`}
                  onClick={() =>
                    setSettings(prev => ({ ...prev, notifications: !prev.notifications }))
                  }
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                      settings.notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Auto Save Toggle */}
              <div className="flex items-center justify-between">
                <Label htmlFor="autoSave" className="text-sm font-medium">
                  Auto Save Conversations
                </Label>
                <button
                  type="button"
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                    settings.autoSave ? 'bg-primary' : 'bg-input'
                  }`}
                  onClick={() =>
                    setSettings(prev => ({ ...prev, autoSave: !prev.autoSave }))
                  }
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                      settings.autoSave ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'provider' && (
            <div className="flex flex-1 flex-col gap-4 py-4">
              {/* Add Provider Button */}
              <div className="flex-shrink-0">
                                <Button
                  onClick={() => setIsAddProviderOpen(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Provider
                </Button>
              </div>

              {/* Existing Providers - Scrollable */}
              <div className="flex-1 flex flex-col">
                <div className="font-medium text-sm mb-3 flex-shrink-0">Existing Providers ({providers.length})</div>
                <div className="flex flex-col flex-1 overflow-y-auto border rounded-lg bg-muted/20">
                  <div className="p-3 space-y-3 pb-6">
                    {providers.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        No providers added yet
                      </div>
                    ) : (
                      providers.map(provider => (
                      <div key={provider.id} className="rounded-md border p-3 space-y-2">
                        <div className="flex justify-between items-center gap-3">
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium truncate">{provider.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {provider.apiKey ? 'Key added' : 'No key'}
                            </span>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingId(provider.id);
                                setEditName(provider.name);
                                setEditKey(provider.apiKey);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteProvider(provider.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                        {editingId === provider.id && (
                          <div className="space-y-2">
                            <Label>Provider</Label>
                            <Select value={editName} onValueChange={setEditName}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select provider" />
                              </SelectTrigger>
                              <SelectContent>
                                {PROVIDER_OPTIONS.map(name => (
                                  <SelectItem key={name} value={name}>{name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Label>API Key</Label>
                            <Input
                              type="password"
                              value={editKey}
                              onChange={e => setEditKey(e.target.value)}
                              placeholder="Enter API key"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  if (!editingId) return;
                                  updateProvider({ id: editingId, name: editName, apiKey: editKey });
                                  setEditingId(null);
                                  setEditName('');
                                  setEditKey('');
                                }}
                              >
                                Save
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {activeTab === 'general' && (
          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={handleReset}>
              Reset to Defaults
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        )}
      </DialogContent>

      {/* Add Provider Modal */}
      <Dialog open={isAddProviderOpen} onOpenChange={setIsAddProviderOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Provider</DialogTitle>
            <DialogDescription>
              Add a new AI provider to your configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="provider">Provider</Label>
              <Select
                value={newProviderName}
                onValueChange={setNewProviderName}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_OPTIONS.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={newProviderKey}
                onChange={e => setNewProviderKey(e.target.value)}
                placeholder="Enter API key"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddProviderOpen(false);
                setNewProviderName('');
                setNewProviderKey('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!newProviderName) return;
                addProvider({ id: Date.now().toString(), name: newProviderName, apiKey: newProviderKey });
                setNewProviderName('');
                setNewProviderKey('');
                setIsAddProviderOpen(false);
              }}
              disabled={!newProviderName}
            >
              Add Provider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
