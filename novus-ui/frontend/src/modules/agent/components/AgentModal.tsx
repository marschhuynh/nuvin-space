  import { useState, useEffect } from 'react';
  import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
  import { Button } from '@/components/ui/button';
  import { Input } from '@/components/ui/input';
  import { Label } from '@/components/ui/label';
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
  import { Slider } from '@/components/ui/slider';
  import { Textarea } from '@/components/ui/textarea';
  import { useAgentStore } from '@/store/useAgentStore';
  import { ModelConfig, AgentSettings } from '@/types';
import { Check, X, Loader2 } from 'lucide-react';
import { a2aService } from '@/lib/a2a';

  interface AgentModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    agent?: AgentSettings | null; // If provided, we're editing; if null/undefined, we're creating
  }

  type AgentPersona = 'helpful' | 'professional' | 'creative' | 'analytical' | 'casual';
  type ResponseLength = 'short' | 'medium' | 'long' | 'detailed';
  type AgentType = 'local' | 'remote';

  export function AgentModal({ open, onOpenChange, agent = null }: AgentModalProps) {
    const { addAgent, updateAgent } = useAgentStore();
    const [testingConnection, setTestingConnection] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [connectionError, setConnectionError] = useState<string>('');

    const [agentData, setAgentData] = useState<{
      name: string;
      persona: AgentPersona;
      responseLength: ResponseLength;
      temperature: number;
      maxTokens: number;
      systemPrompt: string;
      agentType: AgentType;
      url: string; // For remote agents
      modelConfig: ModelConfig;
    }>({
      name: '',
      persona: 'helpful' as AgentPersona,
      responseLength: 'medium' as ResponseLength,
      temperature: 0.7,
      maxTokens: 2048,
      systemPrompt: 'You are a helpful AI assistant. Provide clear, accurate, and useful responses to help users with their questions and tasks.',
      agentType: 'local' as AgentType,
      url: '',
      modelConfig: {
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 2048,
        topP: 1,
        systemPrompt: 'You are a helpful AI assistant. Provide clear, accurate, and useful responses to help users with their questions and tasks.'
      }
    });

    // Initialize form data when editing
    useEffect(() => {
      if (open) {
        if (agent) {
          // Editing existing agent
          setAgentData({
            name: agent.name,
            persona: agent.persona,
            responseLength: agent.responseLength,
            temperature: agent.temperature,
            maxTokens: agent.maxTokens,
            systemPrompt: agent.systemPrompt,
            agentType: agent.agentType,
            url: agent.url || '',
            modelConfig: agent.modelConfig
          });
        } else {
          // Creating new agent - reset to defaults
          resetForm();
        }
        setConnectionStatus('idle');
        setConnectionError('');
      }
    }, [open, agent]);

    const testConnection = async () => {
      if (!agentData.url.trim()) return;

      setTestingConnection(true);
      setConnectionStatus('idle');
      setConnectionError('');

          try {
      // Test the connection using the official A2A SDK
      const isConnected = await a2aService.testConnection(agentData.url);

      if (isConnected) {
        console.log('A2A Agent connected successfully');
        setConnectionStatus('success');
      } else {
        setConnectionStatus('error');
        setConnectionError('Failed to connect to A2A agent');
      }

    } catch (error) {
        console.error('A2A connection test failed:', error);
        setConnectionStatus('error');
        setConnectionError(error instanceof Error ? error.message : 'Connection failed');
      } finally {
        setTestingConnection(false);
      }
    };

    const handleSubmit = () => {
      if (!agentData.name.trim()) return;

      // For remote agents, also check URL
      if (agentData.agentType === 'remote' && !agentData.url.trim()) return;

      const finalAgentData = {
        ...agentData,
        // Update model config for remote agents
        modelConfig: agentData.agentType === 'remote' ? {
          model: 'remote-a2a',
          temperature: agentData.temperature,
          maxTokens: agentData.maxTokens,
          topP: 1,
          systemPrompt: agentData.systemPrompt
        } : agentData.modelConfig
      };

      if (agent) {
        // Editing existing agent
        updateAgent({ ...finalAgentData, id: agent.id });
      } else {
        // Creating new agent
        addAgent({ ...finalAgentData, id: Date.now().toString() });
      }

      onOpenChange(false);
    };

    const resetForm = () => {
      setConnectionStatus('idle');
      setConnectionError('');
      setAgentData({
        name: '',
        persona: 'helpful',
        responseLength: 'medium',
        temperature: 0.7,
        maxTokens: 2048,
        systemPrompt: 'You are a helpful AI assistant. Provide clear, accurate, and useful responses to help users with their questions and tasks.',
        agentType: 'local',
        url: '',
        modelConfig: {
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokens: 2048,
          topP: 1,
          systemPrompt: 'You are a helpful AI assistant. Provide clear, accurate, and useful responses to help users with their questions and tasks.'
        }
      });
    };

    const handleCancel = () => {
      onOpenChange(false);
    };

    const isFormValid = agentData.name.trim() &&
      (agentData.agentType === 'local' ||
      (agentData.agentType === 'remote' && agentData.url.trim()));

    const isEditing = !!agent;

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Agent' : 'Add New Agent'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Modify the AI agent\'s behavior and settings.' : 'Create a new AI agent with custom behavior and settings.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[500px] overflow-y-auto">
            <div className="grid gap-2">
              <Label htmlFor="agentName">Agent Name</Label>
              <Input
                id="agentName"
                value={agentData.name}
                onChange={(e) => setAgentData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter agent name"
              />
            </div>

            {/* Agent Type Toggle */}
            <div className="grid gap-2">
              <Label>Agent Type</Label>
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={() => setAgentData(prev => ({ ...prev, agentType: 'local' }))}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    agentData.agentType === 'local'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  Local Agent
                </button>
                <button
                  type="button"
                  onClick={() => setAgentData(prev => ({ ...prev, agentType: 'remote' }))}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    agentData.agentType === 'remote'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  Remote (A2A)
                </button>
              </div>
            </div>

            {/* Remote Agent URL Field */}
            {agentData.agentType === 'remote' && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="agentUrl">Agent URL</Label>
                  <Input
                    id="agentUrl"
                    value={agentData.url}
                    onChange={(e) => {
                      setAgentData(prev => ({ ...prev, url: e.target.value }));
                      setConnectionStatus('idle');
                      setConnectionError('');
                    }}
                    placeholder="https://example.com/agent"
                  />
                  <p className="text-xs text-muted-foreground">
                    The base URL of the A2A agent
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={testConnection}
                    disabled={!agentData.url.trim() || testingConnection}
                    className="flex items-center gap-2"
                  >
                    {testingConnection ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : connectionStatus === 'success' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : connectionStatus === 'error' ? (
                      <X className="h-4 w-4 text-red-500" />
                    ) : null}
                    Test A2A Connection
                  </Button>

                  {connectionStatus === 'success' && (
                    <span className="text-sm text-green-600">A2A agent connected!</span>
                  )}
                  {connectionStatus === 'error' && (
                    <div className="flex flex-col">
                      <span className="text-sm text-red-600">Connection failed</span>
                      {connectionError && (
                        <span className="text-xs text-red-500">{connectionError}</span>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Local Agent Configuration */}
            {agentData.agentType === 'local' && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="persona">Persona</Label>
                  <Select
                    value={agentData.persona}
                    onValueChange={(value: AgentPersona) =>
                      setAgentData(prev => ({ ...prev, persona: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select persona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="helpful">Helpful Assistant</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="creative">Creative</SelectItem>
                      <SelectItem value="analytical">Analytical</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="responseLength">Response Length</Label>
                  <Select
                    value={agentData.responseLength}
                    onValueChange={(value: ResponseLength) =>
                      setAgentData(prev => ({ ...prev, responseLength: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select response length" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="long">Long</SelectItem>
                      <SelectItem value="detailed">Detailed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="temperature">Temperature: {agentData.temperature}</Label>
                  <Slider
                    value={[agentData.temperature]}
                    onValueChange={(value) => setAgentData(prev => ({ ...prev, temperature: value[0] }))}
                    max={2}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Focused (0)</span>
                    <span>Balanced (1)</span>
                    <span>Creative (2)</span>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="maxTokens">Max Tokens</Label>
                  <Input
                    id="maxTokens"
                    type="number"
                    min="100"
                    max="8192"
                    value={agentData.maxTokens}
                    onChange={(e) => setAgentData(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 2048 }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of tokens in the response (100-8192)
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="systemPrompt">System Prompt</Label>
                  <Textarea
                    id="systemPrompt"
                    value={agentData.systemPrompt}
                    onChange={(e) => setAgentData(prev => ({ ...prev, systemPrompt: e.target.value }))}
                    placeholder="Enter system prompt..."
                    className="min-h-[100px] resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Define the agent's behavior and role
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!isFormValid}>
              {isEditing ? 'Save Changes' : 'Add Agent'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
