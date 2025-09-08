import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type {
  ListToolsRequest,
  CallToolRequest,
} from '@modelcontextprotocol/sdk/types.js';
import { ListToolsResultSchema, CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';

export type MCPHttpOptions = { type: 'http'; url: string; headers?: Record<string, string> };
export type MCPStdioOptions = { type: 'stdio'; command: string; args?: string[]; env?: Record<string, string> };
export type MCPOptions = MCPHttpOptions | MCPStdioOptions;

export type MCPToolSchema = {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
};

export type MCPToolCall = { name: string; arguments?: Record<string, any> };

export type MCPCallResult = {
  content?: Array<unknown>;
  isError?: boolean;
};

export class CoreMCPClient {
  private client: Client | null = null;
  private transport: Transport | null = null;
  private connected = false;
  private tools: MCPToolSchema[] = [];

  constructor(private opts: MCPOptions, private timeoutMs = 30000) {}

  async connect(): Promise<void> {
    if (this.connected) return;
    if (this.client || this.transport) throw new Error('MCP already initialized');

    // Build transport
    if (this.opts.type === 'http') {
      const url = new URL(this.opts.url);
      this.transport = new StreamableHTTPClientTransport(url, {
        requestInit: { headers: this.opts.headers ?? {} },
      });
    } else {
      this.transport = new StdioClientTransport({
        command: this.opts.command,
        args: this.opts.args ?? [],
        env: this.opts.env ?? {},
      });
    }

    // Create SDK client and connect
    this.client = new Client(
      { name: 'nuvin-core-cli', version: '1.0.0' },
      { capabilities: { tools: {}, resources: { subscribe: true }, prompts: {}, logging: {} } },
    );
    await this.client.connect(this.transport);
    this.connected = true;

    await this.refreshTools();
  }

  isConnected(): boolean {
    return this.connected && this.client !== null;
  }

  async disconnect(): Promise<void> {
    try {
      await this.client?.close();
      await this.transport?.close?.();
    } finally {
      this.connected = false;
      this.client = null;
      this.transport = null;
      this.tools = [];
    }
  }

  async refreshTools(): Promise<MCPToolSchema[]> {
    if (!this.client) throw new Error('MCP client not connected');
    const req: ListToolsRequest = { method: 'tools/list', params: {} };
    const res = await this.client.request(req, ListToolsResultSchema);
    const tools = (res.tools ?? []).map((t: { name: string; description?: string; inputSchema?: Record<string, unknown> }) => ({
      name: String(t.name),
      description: t.description,
      inputSchema: t.inputSchema ?? { type: 'object', properties: {}, required: [] },
    }));
    this.tools = tools;
    return tools;
  }

  getTools(): MCPToolSchema[] {
    return this.tools.slice();
  }

  async callTool(call: MCPToolCall): Promise<MCPCallResult> {
    if (!this.client) throw new Error('MCP client not connected');
    const req: CallToolRequest = {
      method: 'tools/call',
      params: { name: call.name, arguments: call.arguments ?? {} },
    };
    return await this.client.request(req, CallToolResultSchema);
  }
}

