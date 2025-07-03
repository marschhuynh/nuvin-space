import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Agent } from '@/types';
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

const DEFAULT_AGENTS: Agent[] = [
  {
    id: 'general-assistant',
    name: 'General Assistant',
    description:
      'A versatile AI assistant capable of helping with various tasks including writing, analysis, and problem-solving.',
    systemPrompt:
      'You are a helpful AI assistant. Provide accurate, helpful, and friendly responses to user queries.',
    tools: [],
    status: 'active',
    lastUsed: '2 minutes ago'
  },
  {
    id: 'code-specialist',
    name: 'Code Specialist',
    description:
      'Expert in software development, code review, debugging, and technical documentation.',
    systemPrompt:
      'You are an expert software developer. Focus on providing high-quality code solutions, best practices, and technical guidance.',
    tools: [],
    status: 'inactive',
    lastUsed: '1 hour ago'
  },
  {
    id: 'research-analyst',
    name: 'Research Analyst',
    description:
      'Specialized in research, data analysis, and providing detailed insights on various topics.',
    systemPrompt:
      'You are a research analyst. Provide thorough, well-researched responses with citations and evidence-based insights.',
    tools: [],
    status: 'inactive',
    lastUsed: 'Yesterday'
  }
];

export function SettingsDialog() {
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'system',
    apiEndpoint: 'https://api.example.com',
    apiKey: '',
    notifications: true,
    autoSave: true,
    fontSize: 'medium'
  });
  const [activeTab, setActiveTab] = useState<'general' | 'agent'>('general');

  const handleSave = () => {
    // In a real app, this would save settings to storage or send to backend
    console.log('Settings saved:', settings);
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
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your application preferences and settings.
          </DialogDescription>
        </DialogHeader>

        <div>
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
                  activeTab === 'agent' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'
                }`}
                onClick={() => setActiveTab('agent')}
              >
                Agent
              </button>
            </nav>
          </div>

          {activeTab === 'general' && (
            <div className="grid gap-6 py-4">
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

              {/* API Endpoint */}
              <div className="grid gap-2">
                <Label htmlFor="apiEndpoint">API Endpoint</Label>
                <Input
                  id="apiEndpoint"
                  type="url"
                  value={settings.apiEndpoint}
                  onChange={e =>
                    setSettings(prev => ({ ...prev, apiEndpoint: e.target.value }))
                  }
                  placeholder="https://api.example.com"
                />
              </div>

              {/* API Key */}
              <div className="grid gap-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={settings.apiKey}
                  onChange={e =>
                    setSettings(prev => ({ ...prev, apiKey: e.target.value }))
                  }
                  placeholder="Enter your API key"
                />
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

          {activeTab === 'agent' && (
            <div className="grid gap-4 py-4 max-h-60 overflow-y-auto">
              {DEFAULT_AGENTS.map(agent => (
                <div key={agent.id} className="rounded-md border p-3">
                  <div className="font-medium">{agent.name}</div>
                  <p className="text-sm text-muted-foreground">
                    {agent.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {activeTab === 'general' && (
          <DialogFooter>
            <Button variant="outline" onClick={handleReset}>
              Reset to Defaults
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
