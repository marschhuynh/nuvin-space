import { JsonFileMemoryPersistence } from './persistent/index.js';

export type MCPServerConfig = {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  // Optional HTTP transport support
  transport?: 'stdio' | 'http';
  url?: string;
  headers?: Record<string, string>;
  // Optional tool name prefix override (defaults to mcp_<serverId>_)
  prefix?: string;
  // Optional timeout for MCP operations in milliseconds (default: 30000)
  timeoutMs?: number;
};

export type MCPConfig = {
  mcpServers: Record<string, MCPServerConfig>;
};

export async function loadMCPConfig(filePath: string = '.nuvin_mcp.json'): Promise<MCPConfig | null> {
  try {
    // Reuse JsonFileMemoryPersistence to read raw JSON from disk
    const persistence = new JsonFileMemoryPersistence<any>(filePath);
    const data = await persistence.load();
    // Accept direct shape { mcpServers: { ... } }
    if (data && typeof data === 'object' && data.mcpServers && typeof data.mcpServers === 'object') {
      return data as MCPConfig;
    }
    // Accept nested under { config: { mcpServers: { ... } } }
    if (data && typeof (data as any).config === 'object' && (data as any).config.mcpServers) {
      return (data as any).config as MCPConfig;
    }
    return null;
  } catch {
    return null;
  }
}

