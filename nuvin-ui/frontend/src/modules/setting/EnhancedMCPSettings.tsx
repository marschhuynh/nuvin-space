import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Edit,
  Trash2,
  Play,
  Square,
  RotateCcw,
  Settings,
  X,
  Save,
  Server,
  Wrench,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { MCPConfig } from "@/types/mcp";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useMCPServers } from "@/lib/mcp/hooks/useMCPServers";
import { useMCPStatus } from "@/lib/mcp/hooks/useMCPStatus";
import { MCPServerStatus } from "@/components/mcp/MCPServerStatus";
import { MCPToolsList } from "@/components/mcp/MCPToolsList";

interface EnhancedMCPSettingsProps {
  settings: any;
  onSettingsChange: (settings: any) => void;
}

export function EnhancedMCPSettings({ settings, onSettingsChange }: EnhancedMCPSettingsProps) {
  const {
    servers,
    addServer,
    updateServer,
    removeServer,
    startServer,
    stopServer,
    restartServer,
    toggleServer,
  } = useMCPServers();

  const { isInitialized, stats } = useMCPStatus();

  const [showAddMCPModal, setShowAddMCPModal] = useState(false);
  const [editingMCP, setEditingMCP] = useState<MCPConfig | null>(null);
  const [selectedMCPId, setSelectedMCPId] = useState<string | null>(null);
  const [mcpForm, setMcpForm] = useState<Partial<MCPConfig>>({
    name: "",
    command: "",
    args: [],
    env: {},
    enabled: true,
    description: "",
  });

  const selectedMCP = servers.find((mcp) => mcp.id === selectedMCPId);

  const handleAddMCP = () => {
    setEditingMCP(null);
    setMcpForm({
      name: "",
      command: "",
      args: [],
      env: {},
      enabled: true,
      description: "",
    });
    setShowAddMCPModal(true);
  };

  const handleEditMCP = (mcp: MCPConfig) => {
    setEditingMCP(mcp);
    setMcpForm({
      name: mcp.name,
      command: mcp.command,
      args: mcp.args || [],
      env: mcp.env || {},
      enabled: mcp.enabled,
      description: mcp.description || "",
    });
    setShowAddMCPModal(true);
  };

  const handleDeleteMCP = async (mcpId: string) => {
    try {
      await removeServer(mcpId);
      if (selectedMCPId === mcpId) {
        const remainingServers = servers.filter(s => s.id !== mcpId);
        setSelectedMCPId(remainingServers.length > 0 ? remainingServers[0].id : null);
      }
    } catch (error) {
      console.error('Failed to delete MCP server:', error);
    }
  };

  const handleSaveMCP = async () => {
    if (!mcpForm.name || !mcpForm.command) return;

    try {
      const mcpConfig: MCPConfig = {
        id: editingMCP?.id || crypto.randomUUID(),
        name: mcpForm.name!,
        command: mcpForm.command!,
        args: mcpForm.args || [],
        env: mcpForm.env || {},
        enabled: mcpForm.enabled!,
        description: mcpForm.description || "",
      };

      if (editingMCP) {
        await updateServer(editingMCP.id, mcpConfig);
      } else {
        await addServer(mcpConfig);
        setSelectedMCPId(mcpConfig.id);
      }

      setShowAddMCPModal(false);
      setEditingMCP(null);
    } catch (error) {
      console.error('Failed to save MCP server:', error);
    }
  };

  const handleToggleMCP = async (mcpId: string, enabled: boolean) => {
    try {
      await toggleServer(mcpId, enabled);
    } catch (error) {
      console.error('Failed to toggle MCP server:', error);
    }
  };

  const handleEnvVarChange = (key: string, value: string) => {
    setMcpForm((prev) => ({
      ...prev,
      env: { ...prev.env, [key]: value },
    }));
  };

  const handleArgChange = (index: number, value: string) => {
    const newArgs = [...(mcpForm.args || [])];
    newArgs[index] = value;
    setMcpForm((prev) => ({ ...prev, args: newArgs }));
  };

  const addArg = () => {
    setMcpForm((prev) => ({ ...prev, args: [...(prev.args || []), ""] }));
  };

  const removeArg = (index: number) => {
    const newArgs = [...(mcpForm.args || [])];
    newArgs.splice(index, 1);
    setMcpForm((prev) => ({ ...prev, args: newArgs }));
  };

  const addEnvVar = () => {
    const key = `VAR_${Object.keys(mcpForm.env || {}).length + 1}`;
    setMcpForm((prev) => ({
      ...prev,
      env: { ...prev.env, [key]: "" },
    }));
  };

  const removeEnvVar = (key: string) => {
    const newEnv = { ...mcpForm.env };
    delete newEnv[key];
    setMcpForm((prev) => ({ ...prev, env: newEnv }));
  };

  return (
    <div className="space-y-6">
      {/* MCP Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Server className="w-5 h-5 mr-2" />
            MCP Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalServers}</div>
              <div className="text-sm text-gray-600">Total Servers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.runningServers}</div>
              <div className="text-sm text-gray-600">Running</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.totalTools}</div>
              <div className="text-sm text-gray-600">Total Tools</div>
            </div>
            <div className="text-center">
              <Badge variant={isInitialized ? "default" : "secondary"} className="text-sm">
                {isInitialized ? "Initialized" : "Not Initialized"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="servers" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="servers">MCP Servers</TabsTrigger>
          <TabsTrigger value="tools">Available Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="servers" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">MCP Servers</h3>
            <Button onClick={handleAddMCP} className="flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              Add Server
            </Button>
          </div>

          <div className="space-y-3">
            {servers.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Server className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 mb-4">No MCP servers configured</p>
                  <Button onClick={handleAddMCP} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Server
                  </Button>
                </CardContent>
              </Card>
            ) : (
              servers.map((server) => (
                <div key={server.id} className="space-y-2">
                  <MCPServerStatus
                    server={server}
                    onStart={startServer}
                    onStop={stopServer}
                    onRestart={restartServer}
                  />
                  <div className="flex justify-between items-center px-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={server.enabled}
                        onCheckedChange={(enabled) => handleToggleMCP(server.id, enabled)}
                      />
                      <Label className="text-sm">Auto-start</Label>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditMCP(server)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteMCP(server.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="tools" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Available Tools</h3>
            <Badge variant="outline" className="text-sm">
              {stats.totalTools} tools available
            </Badge>
          </div>

          <MCPToolsList showAll={true} />
        </TabsContent>
      </Tabs>

      {/* Add/Edit MCP Modal */}
      <Dialog open={showAddMCPModal} onOpenChange={setShowAddMCPModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMCP ? "Edit MCP Server" : "Add MCP Server"}
            </DialogTitle>
            <DialogDescription>
              Configure an MCP server to add tools and resources to your agent.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mcp-name">Name</Label>
                <Input
                  id="mcp-name"
                  value={mcpForm.name}
                  onChange={(e) =>
                    setMcpForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="My MCP Server"
                />
              </div>
              <div>
                <Label htmlFor="mcp-enabled">
                  <Switch
                    checked={mcpForm.enabled}
                    onCheckedChange={(enabled) =>
                      setMcpForm((prev) => ({ ...prev, enabled }))
                    }
                  />
                  <span className="ml-2">Enabled</span>
                </Label>
              </div>
            </div>

            <div>
              <Label htmlFor="mcp-command">Command</Label>
              <Input
                id="mcp-command"
                value={mcpForm.command}
                onChange={(e) =>
                  setMcpForm((prev) => ({ ...prev, command: e.target.value }))
                }
                placeholder="python -m my_mcp_server"
              />
            </div>

            <div>
              <Label htmlFor="mcp-description">Description (Optional)</Label>
              <Textarea
                id="mcp-description"
                value={mcpForm.description}
                onChange={(e) =>
                  setMcpForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Description of what this MCP server provides"
                rows={2}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Arguments</Label>
                <Button size="sm" variant="outline" onClick={addArg}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {(mcpForm.args || []).map((arg, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={arg}
                      onChange={(e) => handleArgChange(index, e.target.value)}
                      placeholder={`Argument ${index + 1}`}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeArg(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Environment Variables</Label>
                <Button size="sm" variant="outline" onClick={addEnvVar}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {Object.entries(mcpForm.env || {}).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Input
                      value={key}
                      onChange={(e) => {
                        const newKey = e.target.value;
                        const newEnv = { ...mcpForm.env };
                        delete newEnv[key];
                        newEnv[newKey] = value;
                        setMcpForm((prev) => ({ ...prev, env: newEnv }));
                      }}
                      placeholder="Variable name"
                      className="w-1/2"
                    />
                    <Input
                      value={value}
                      onChange={(e) => handleEnvVarChange(key, e.target.value)}
                      placeholder="Variable value"
                      className="w-1/2"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeEnvVar(key)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAddMCPModal(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveMCP}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}