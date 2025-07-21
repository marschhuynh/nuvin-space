import { useMemo, useState, useEffect } from 'react';
import { toolRegistry } from '@/lib/tools/tool-registry';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Wrench,
  Server,
  Package,
  Search,
  ChevronDown,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MCPToolsListProps {
  serverId?: string;
  showAll?: boolean;
  onToolToggle?: (
    toolName: string,
    enabled: boolean,
    serverId?: string,
  ) => void;
  enabledTools?: string[];
}

export function MCPToolsList({
  serverId,
  showAll = false,
  onToolToggle,
  enabledTools = [],
}: MCPToolsListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<
    'all' | 'enabled' | 'disabled' | 'available' | 'unavailable'
  >('all');
  const [expandedServers, setExpandedServers] = useState<Set<string>>(
    new Set(),
  );

  const { mcpTools, builtInTools, totalTools, filteredTools } = useMemo(() => {
    let allMCPTools: any[] = [];
    let allBuiltInTools: any[] = [];

    if (serverId) {
      // Show tools for specific server
      allMCPTools = toolRegistry.getMCPToolsForServer(serverId);
    } else if (showAll) {
      // Show all tools
      allMCPTools = toolRegistry.getAllMCPTools();
      allBuiltInTools = toolRegistry.getBuiltInTools();
    } else {
      // Show only MCP tools
      allMCPTools = toolRegistry.getAllMCPTools();
    }

    const allTools = [...allMCPTools, ...allBuiltInTools];

    // Apply search filter
    const searchFiltered = searchTerm
      ? allTools.filter((tool) => {
          const name =
            tool.definition?.name || tool.getMCPSchema?.()?.name || '';
          const description =
            tool.definition?.description ||
            tool.getMCPSchema?.()?.description ||
            '';
          return (
            name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            description.toLowerCase().includes(searchTerm.toLowerCase())
          );
        })
      : allTools;

    // Apply type filter
    const typeFiltered = searchFiltered.filter((tool) => {
      const toolName =
        tool.definition?.name || tool.getMCPSchema?.()?.name || '';
      const isEnabled = enabledTools.includes(toolName);
      const isAvailable = tool.isAvailable?.() !== false;

      switch (filterType) {
        case 'enabled':
          return isEnabled;
        case 'disabled':
          return !isEnabled;
        case 'available':
          return isAvailable;
        case 'unavailable':
          return !isAvailable;
        default:
          return true;
      }
    });

    return {
      mcpTools: allMCPTools,
      builtInTools: allBuiltInTools,
      totalTools: allTools.length,
      filteredTools: typeFiltered,
    };
  }, [serverId, showAll, searchTerm, filterType, enabledTools]);

  const toolsByServer = useMemo(() => {
    const grouped = new Map<string, any[]>();
    const filteredMCPTools = filteredTools.filter(
      (tool) => 'getServerId' in tool,
    );

    filteredMCPTools.forEach((tool: any) => {
      const serverIdFromTool = tool.getServerId();
      if (!grouped.has(serverIdFromTool)) {
        grouped.set(serverIdFromTool, []);
      }
      grouped.get(serverIdFromTool)!.push(tool);
    });

    return grouped;
  }, [filteredTools]);

  // Auto-expand all servers when first loaded
  const serverIds = useMemo(
    () => Array.from(toolsByServer.keys()),
    [toolsByServer],
  );

  // Initialize expanded servers with all server IDs
  useEffect(() => {
    if (serverIds.length > 0 && expandedServers.size === 0) {
      setExpandedServers(new Set(serverIds));
    }
  }, [serverIds, expandedServers.size]);

  const filteredBuiltInTools = useMemo(() => {
    return filteredTools.filter((tool) => !('getServerId' in tool));
  }, [filteredTools]);

  const toggleServerExpansion = (serverId: string) => {
    setExpandedServers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(serverId)) {
        newSet.delete(serverId);
      } else {
        newSet.add(serverId);
      }
      return newSet;
    });
  };

  const handleToolToggle = (
    toolName: string,
    enabled: boolean,
    serverIdForTool?: string,
  ) => {
    if (onToolToggle) {
      onToolToggle(toolName, enabled, serverIdForTool);
    }
  };

  const expandAllServers = () => {
    setExpandedServers(new Set(serverIds));
  };

  const collapseAllServers = () => {
    setExpandedServers(new Set());
  };

  const allExpanded =
    expandedServers.size === serverIds.length && serverIds.length > 0;

  if (filteredTools.length === 0 && searchTerm) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Search className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 mb-2">
            No tools found matching "{searchTerm}"
          </p>
          <Button variant="outline" onClick={() => setSearchTerm('')}>
            Clear search
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (totalTools === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">
            {serverId
              ? 'No tools available for this server'
              : 'No MCP tools available'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search tools..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <Select
            value={filterType}
            onValueChange={(value: any) => setFilterType(value)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tools</SelectItem>
              <SelectItem value="enabled">Enabled Only</SelectItem>
              <SelectItem value="disabled">Disabled Only</SelectItem>
              <SelectItem value="available">Available Only</SelectItem>
              <SelectItem value="unavailable">Unavailable Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing {filteredTools.length} of {totalTools} tools
          {searchTerm && ` matching "${searchTerm}"`}
          {filterType !== 'all' && ` (${filterType})`}
        </div>
        {serverIds.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={allExpanded ? collapseAllServers : expandAllServers}
          >
            {allExpanded ? 'Collapse All' : 'Expand All'}
          </Button>
        )}
      </div>

      {/* Built-in tools section */}
      {showAll && filteredBuiltInTools.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Wrench className="w-5 h-5 mr-2" />
              Built-in Tools ({filteredBuiltInTools.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              {filteredBuiltInTools.map((tool: any) => (
                <div
                  key={tool.definition.name}
                  className="border rounded-lg p-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">
                        <Switch
                          checked={enabledTools.includes(tool.definition.name)}
                          onCheckedChange={(enabled) =>
                            handleToolToggle(tool.definition.name, enabled)
                          }
                          disabled={!onToolToggle}
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">
                          {tool.definition.name}
                        </h4>
                        <p className="text-xs text-gray-600 mt-1">
                          {tool.definition.description}
                        </p>
                      </div>
                    </div>
                    <div className="ml-2 flex flex-col items-end space-y-1">
                      <Badge variant="secondary">Built-in</Badge>
                      {enabledTools.includes(tool.definition.name) && (
                        <Badge
                          variant="default"
                          className="bg-green-100 text-green-800"
                        >
                          Enabled
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* MCP tools sections */}
      {Array.from(toolsByServer.entries()).map(([serverIdKey, tools]) => {
        const isExpanded = expandedServers.has(serverIdKey);
        return (
          <Card key={serverIdKey}>
            <CardHeader
              className="pb-3 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleServerExpansion(serverIdKey)}
              title={isExpanded ? 'Click to collapse' : 'Click to expand'}
            >
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center">
                  <Server className="w-5 h-5 mr-2" />
                  {serverId ? 'Tools' : `Server: ${serverIdKey}`} (
                  {tools.length})
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5" />
                ) : (
                  <ChevronRight className="w-5 h-5" />
                )}
              </CardTitle>
            </CardHeader>
            {isExpanded && (
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  {tools.map((tool) => (
                    <div
                      key={tool.getMCPSchema().name}
                      className="border rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="mt-1">
                            <Switch
                              checked={enabledTools.includes(
                                tool.getMCPSchema().name,
                              )}
                              onCheckedChange={(enabled) =>
                                handleToolToggle(
                                  tool.getMCPSchema().name,
                                  enabled,
                                  serverIdKey,
                                )
                              }
                              disabled={!onToolToggle || !tool.isAvailable()}
                            />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">
                              {tool.getMCPSchema().name}
                            </h4>
                            <p className="text-xs text-gray-600 mt-1">
                              {tool.getMCPSchema().description}
                            </p>

                            {/* Tool parameters preview */}
                            {tool.getMCPSchema().inputSchema.properties && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-gray-700 mb-1">
                                  Parameters:
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {Object.keys(
                                    tool.getMCPSchema().inputSchema.properties,
                                  )
                                    .slice(0, 3)
                                    .map((param) => (
                                      <Badge
                                        key={param}
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {param}
                                      </Badge>
                                    ))}
                                  {Object.keys(
                                    tool.getMCPSchema().inputSchema.properties,
                                  ).length > 3 && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      +
                                      {Object.keys(
                                        tool.getMCPSchema().inputSchema
                                          .properties,
                                      ).length - 3}{' '}
                                      more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="ml-2 flex flex-col items-end space-y-1">
                          <Badge
                            variant={
                              tool.isAvailable() ? 'default' : 'secondary'
                            }
                            className={
                              tool.isAvailable()
                                ? 'bg-green-100 text-green-800'
                                : ''
                            }
                          >
                            {tool.isAvailable() ? 'Available' : 'Unavailable'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            MCP
                          </Badge>
                          {enabledTools.includes(tool.getMCPSchema().name) && (
                            <Badge
                              variant="default"
                              className="bg-green-100 text-green-800"
                            >
                              Enabled
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
