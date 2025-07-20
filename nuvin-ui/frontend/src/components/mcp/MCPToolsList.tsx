import { useMemo } from 'react';
import { toolRegistry } from '@/lib/tools/tool-registry';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, Server, Package } from 'lucide-react';

interface MCPToolsListProps {
  serverId?: string;
  showAll?: boolean;
}

export function MCPToolsList({ serverId, showAll = false }: MCPToolsListProps) {
  const { mcpTools, builtInTools, totalTools } = useMemo(() => {
    if (serverId) {
      // Show tools for specific server
      const serverTools = toolRegistry.getMCPToolsForServer(serverId);
      return {
        mcpTools: serverTools,
        builtInTools: [],
        totalTools: serverTools.length,
      };
    } else if (showAll) {
      // Show all tools
      const allMCPTools = toolRegistry.getAllMCPTools();
      const allBuiltInTools = toolRegistry.getBuiltInTools();
      return {
        mcpTools: allMCPTools,
        builtInTools: allBuiltInTools,
        totalTools: allMCPTools.length + allBuiltInTools.length,
      };
    } else {
      // Show only MCP tools
      const allMCPTools = toolRegistry.getAllMCPTools();
      return {
        mcpTools: allMCPTools,
        builtInTools: [],
        totalTools: allMCPTools.length,
      };
    }
  }, [serverId, showAll]);

  const toolsByServer = useMemo(() => {
    const grouped = new Map<string, typeof mcpTools>();
    
    mcpTools.forEach(tool => {
      const serverIdFromTool = tool.getServerId();
      if (!grouped.has(serverIdFromTool)) {
        grouped.set(serverIdFromTool, []);
      }
      grouped.get(serverIdFromTool)!.push(tool);
    });
    
    return grouped;
  }, [mcpTools]);

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
      {/* Built-in tools section */}
      {showAll && builtInTools.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Wrench className="w-5 h-5 mr-2" />
              Built-in Tools ({builtInTools.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {builtInTools.map(tool => (
                <div key={tool.definition.name} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{tool.definition.name}</h4>
                      <p className="text-xs text-gray-600 mt-1">
                        {tool.definition.description}
                      </p>
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      Built-in
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* MCP tools sections */}
      {Array.from(toolsByServer.entries()).map(([serverIdKey, tools]) => (
        <Card key={serverIdKey}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Server className="w-5 h-5 mr-2" />
              {serverId ? 'Tools' : `Server: ${serverIdKey}`} ({tools.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tools.map(tool => (
                <div key={tool.definition.name} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between">
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
                          <p className="text-xs font-medium text-gray-700 mb-1">Parameters:</p>
                          <div className="flex flex-wrap gap-1">
                            {Object.keys(tool.getMCPSchema().inputSchema.properties).slice(0, 3).map(param => (
                              <Badge key={param} variant="outline" className="text-xs">
                                {param}
                              </Badge>
                            ))}
                            {Object.keys(tool.getMCPSchema().inputSchema.properties).length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{Object.keys(tool.getMCPSchema().inputSchema.properties).length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="ml-2 flex flex-col items-end space-y-1">
                      <Badge 
                        variant={tool.isAvailable() ? "default" : "secondary"}
                        className={tool.isAvailable() ? "bg-green-100 text-green-800" : ""}
                      >
                        {tool.isAvailable() ? 'Available' : 'Unavailable'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        MCP
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}