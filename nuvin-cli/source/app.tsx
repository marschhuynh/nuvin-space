import React, {useEffect, useRef, useState, useMemo} from 'react';
import {Box, Text, useApp} from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {prompt} from './prompt.js';

// Core imports from the monorepo
import {AgentOrchestrator} from '../../nuvin-core/orchestrator.js';
import {SimpleContextBuilder} from '../../nuvin-core/context.js';
import {InMemoryMemory, PersistedMemory, JsonFileMemoryPersistence} from '../../nuvin-core/persistent/index.js';
import type {Message} from '../../nuvin-core/ports.js';
import {SimpleId} from '../../nuvin-core/id.js';
import {SystemClock} from '../../nuvin-core/clock.js';
import {SimpleCost} from '../../nuvin-core/cost.js';
import {NoopReminders} from '../../nuvin-core/reminders.js';
import {ToolRegistry} from '../../nuvin-core/tools.js';
import {EchoLLM, GithubLLM, OpenRouterLLM} from '../../nuvin-core/llm-providers/index.js';
import {MCPToolPort, CoreMCPClient} from '../../nuvin-core/mcp/index.js';
// import {MCPToolPort} from '../../nuvin-core/mcp-tools.js';
import {CompositeToolPort} from '../../nuvin-core/tools-composite.js';
import {loadMCPConfig} from '../../nuvin-core/config.js';
import {PersistingConsoleEventPort} from '../../nuvin-core/events.js';
import type {TodoItem as StoreTodo} from '../../nuvin-core/todo-store.js';
import type {AgentEvent} from '../../nuvin-core/ports.js';
import {AgentEventTypes} from '../../nuvin-core/ports.js';

type Props = {
  useOpenRouter?: boolean;
  useGithub?: boolean;
  memPersist?: boolean;
  mcpConfigPath?: string;
};

type Line = {text: string; color?: string};

class UIEventPort extends PersistingConsoleEventPort {
  private toolCallCount = 0;
  private streamingActive = false;

  constructor(
    private appendLine: (text: string, color?: string) => void,
    private appendAssistantChunk: (delta: string) => void,
    private setLastMetadata: (metadata: any) => void,
    opts: {filename: string}
  ) {
    super({ filename: opts.filename });
  }

  override async emit(event: AgentEvent): Promise<void> {
    super.emit(event); // Persist event
    switch (event.type) {
      case AgentEventTypes.MessageStarted:
        // Reset tool count for new message
        this.toolCallCount = 0;
        this.streamingActive = false;
        break;

      case AgentEventTypes.ToolCalls:
        this.toolCallCount += event.toolCalls.length;
        this.appendLine(`Using ${event.toolCalls.length} tool${event.toolCalls.length > 1 ? 's' : ''}: ${event.toolCalls.map(tc => tc.function.name).join(', ')}`, 'blue');
        break;

      case AgentEventTypes.ToolResult:
        const tool = event.result;
        const status = tool.status === 'success' ? '‣' : '■';
        const duration = tool.durationMs !== undefined ? ` (${tool.durationMs}ms)` : '';
        this.appendLine(`${status} ${tool.name}: ${tool.status}${duration}`, tool.status === 'success' ? 'green' : 'red');
        break;

      case AgentEventTypes.AssistantChunk:
        if (!this.streamingActive) {
          this.streamingActive = true;
          this.appendLine(`assistant: `);
        }
        if (event.delta) this.appendAssistantChunk(event.delta);
        break;

      case AgentEventTypes.AssistantMessage:
        if (!this.streamingActive && event.content) {
          this.appendLine(`assistant: ${event.content}`);
        }
        this.streamingActive = false;
        break;

      case AgentEventTypes.Done:
        // Update metadata in footer
        const usage = event.usage;
        if (usage) {
          this.setLastMetadata({
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
            responseTime: event.responseTimeMs,
            toolCalls: this.toolCallCount,
            estimatedCost: null // Could calculate if we have pricing info
          });
        }
        break;

      case AgentEventTypes.Error:
        this.appendLine(`error: ${event.error}`, 'red');
        break;
    }
  }
}

export default function App({useOpenRouter = false, useGithub = false, memPersist = false, mcpConfigPath}: Props) {
  const {exit} = useApp();
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>('Initializing...');
  const orchestratorRef = useRef<AgentOrchestrator | null>(null);
  const mcpClientsRef = useRef<CoreMCPClient[]>([]);
  const [provider, setProvider] = useState<'OpenRouter' | 'GitHub' | 'Echo'>('Echo');
  const [model, setModel] = useState<string>('demo-echo');
  const [lastMetadata, setLastMetadata] = useState<any>(null);

  // Initialize a session directory inside .history/<timestamp> on first render
  const sessionId = useMemo(() => String(Date.now()), []);
  const sessionDir = useMemo(() => path.join('.history', sessionId), [sessionId]);

  useEffect(() => {
    let didCancel = false;

    (async () => {
      // Ensure session directory exists
      try {
        fs.mkdirSync(sessionDir, {recursive: true});
      } catch {}

      // Provider selection
      const selectedProvider = useOpenRouter ? 'OpenRouter' : useGithub ? 'GitHub' : 'Echo';
      setProvider(selectedProvider);

      const llm = useOpenRouter
        ? new OpenRouterLLM(String(process.env.OPENROUTER_API_KEY || ''))
        : useGithub
        ? new GithubLLM({
            apiKey: process.env.GITHUB_COPILOT_API_KEY || undefined,
            accessToken: process.env.GITHUB_ACCESS_TOKEN || undefined,
          })
        : new EchoLLM();

      const resolvedModel = useOpenRouter
        ? process.env.OPENROUTER_MODEL || 'openai/gpt-4.1-mini'
        : useGithub
        ? process.env.GITHUB_MODEL || 'gpt-4.1'
        : 'demo-echo';
      setModel(resolvedModel);

      // Memory (per-session if persisted)
      const memory = memPersist
        ? new PersistedMemory<Message>(
            new JsonFileMemoryPersistence<Message>(path.join(sessionDir, '.nuvin_history.json')),
          )
        : new InMemoryMemory<Message>();

      // Tools: local and optional MCP (persist tool names and todos under session dir)
      const toolsMemory = new PersistedMemory<string>(
        new JsonFileMemoryPersistence<string>(path.join(sessionDir, '.nuvin_tools.json')),
      );
      const todosMemory = new PersistedMemory<StoreTodo>(
        new JsonFileMemoryPersistence<StoreTodo>(path.join(sessionDir, '.nuvin_todos.json')),
      );
      const localTools = new ToolRegistry({toolsMemory, todoMemory: todosMemory});

      let toolsPort: ToolRegistry | CompositeToolPort = localTools;
      const enabledTools: string[] = ['todo_write'];

      const mcpPorts: MCPToolPort[] = [];
      const configPath = mcpConfigPath || '.nuvin_mcp.json';
      try {
        const cfg = await loadMCPConfig(configPath);
        if (cfg?.mcpServers) {
          for (const [serverId, serverCfg] of Object.entries(cfg.mcpServers)) {
            try {
              let client: CoreMCPClient | null = null;
              const timeoutMs = serverCfg.timeoutMs || 30000; // Default 30 seconds
              if (serverCfg.transport === 'http' && serverCfg.url) {
                client = new CoreMCPClient({type: 'http', url: serverCfg.url, headers: serverCfg.headers}, timeoutMs);
              } else if (serverCfg.command) {
                client = new CoreMCPClient({type: 'stdio', command: serverCfg.command, args: serverCfg.args, env: serverCfg.env}, timeoutMs);
              }
              if (!client) {
                appendLine(`MCP server '${serverId}' missing transport info; skipping`, 'yellow');
                continue;
              }
              const prefix = serverCfg.prefix || `mcp_${serverId}_`;
              const port = new MCPToolPort(client, {prefix});
              await port.init();
              const exposed = port.getExposedToolNames();
              if (exposed.length) {
                mcpPorts.push(port);
                mcpClientsRef.current.push(client); // Track for cleanup
                enabledTools.push(...exposed);
                appendLine(`MCP server '${serverId}' loaded with ${exposed.length} tools (prefix='${prefix}', timeout=${timeoutMs}ms).`, 'green');
              } else {
                appendLine(`MCP server '${serverId}' has no tools.`, 'yellow');
              }
            } catch (err: unknown) {
              const message = typeof err === 'object' && err !== null && 'message' in err
                ? (err as {message?: string}).message
                : String(err);
              appendLine(`Failed to initialize MCP server '${serverId}': ${message}`, 'red');
            }
          }
        }
      } catch (err: unknown) {
        const message = typeof err === 'object' && err !== null && 'message' in err
          ? (err as {message?: string}).message
          : String(err);
        appendLine(`Failed to load MCP config from ${configPath}: ${message}`, 'yellow');
      }
      if (mcpPorts.length > 0) {
        toolsPort = new CompositeToolPort([localTools, ...mcpPorts]);
      }

      const orchestrator = new AgentOrchestrator(
        {
          id: 'core-demo-agent',
          systemPrompt: prompt,
          temperature: 1,
          topP: 1,
          maxTokens: 512,
          model: resolvedModel,
          enabledTools,
          maxToolConcurrency: 3,
        },
        {
          memory,
          llm,
          tools: toolsPort,
          context: new SimpleContextBuilder(),
          ids: new SimpleId(),
          clock: new SystemClock(),
          cost: new SimpleCost(),
          reminders: new NoopReminders(),
          events: new UIEventPort(appendLine, appendAssistantChunk, setLastMetadata, {
            filename: path.join(sessionDir, '.nuvin_events.json')
          }),
        },
      );

      if (didCancel) return;
      orchestratorRef.current = orchestrator;

      // Header lines similar to original CLI
      appendLine(`Core Agent CLI (${selectedProvider}). Type 'exit' to quit.`);
      appendLine(`Session: ${sessionId} -> ${sessionDir}`);
      if (selectedProvider === 'OpenRouter') {
        appendLine(`Using OpenRouter API. Model: ${resolvedModel}.`);
      } else if (selectedProvider === 'GitHub') {
        appendLine(`Using GitHub Copilot API. Model: ${resolvedModel}.`);
        if (process.env.GITHUB_ACCESS_TOKEN) appendLine(`Auth via access token -> transport handles exchange/refresh.`);
      } else {
        appendLine(`Tips: '!reverse your text' or '!wc your text' to trigger tools.`);
      }
      appendLine(`Use 'todo_write' with echo via: !todo [{"id":"t1","content":"setup project","status":"pending","priority":"high"}]`);
      appendLine(mcpPorts.length > 0 ? `Loaded ${mcpPorts.length} MCP server(s) from ${configPath}.` : `No MCP servers loaded. Provide ${configPath} to enable MCP.`);
      setStatus('Ready');
    })();

    return () => {
      didCancel = true;
      // Cleanup MCP connections on component unmount
      void cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useOpenRouter, useGithub, memPersist, mcpConfigPath]);

  const appendLine = (text: string, color?: string) => setLines(prev => [...prev, {text, color}]);
  const appendAssistantChunk = (delta: string) =>
    setLines(prev => {
      if (prev.length === 0) return [...prev, { text: `assistant: ${delta}` }];
      const next = [...prev];
      // Find the last assistant line to append to; default to last line
      let idx = next.length - 1;
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].text.startsWith('assistant:')) { idx = i; break; }
      }
      const current = next[idx];
      const base = current?.text ?? '';
      next[idx] = { ...current, text: base + delta };
      return next;
    });

  const cleanup = async () => {
    // Disconnect all MCP clients
    if (mcpClientsRef.current.length > 0) {
      appendLine(`🔌 Disconnecting ${mcpClientsRef.current.length} MCP server${mcpClientsRef.current.length > 1 ? 's' : ''}...`, 'yellow');

      const disconnectPromises = mcpClientsRef.current.map(async (client, index) => {
        try {
          await client.disconnect();
          appendLine(`✅ MCP server ${index + 1} disconnected`, 'green');
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          appendLine(`⚠️ Error disconnecting MCP server ${index + 1}: ${message}`, 'yellow');
        }
      });

      await Promise.allSettled(disconnectPromises);
      mcpClientsRef.current = [];
    }
  };

  const handleSlashCommand = async (command: string, args: string): Promise<boolean> => {
    switch (command) {
      case '/exit':
        appendLine('👋 Goodbye!', 'cyan');
        await cleanup();
        exit();
        return true;

      default:
        appendLine(`❌ Unknown command: ${command}`, 'red');
        appendLine('Available commands: /exit', 'gray');
        return true;
    }
  };

  const handleSubmit = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    // Handle slash commands
    if (trimmed.startsWith('/')) {
      const parts = trimmed.split(' ');
      const command = parts[0];
      const args = parts.slice(1).join(' ');

      appendLine(`> ${trimmed}`, 'cyan');
      setInput('');

      const handled = await handleSlashCommand(command, args);
      if (handled) return;
    }

    // Legacy exit commands
    if (trimmed.toLowerCase() === 'exit' || trimmed.toLowerCase() === 'quit') {
      appendLine('Bye!');
      await cleanup();
      exit();
      return;
    }

    appendLine(`> ${trimmed}`, 'cyan');
    setInput('');
    setBusy(true);

    try {
      const orch = orchestratorRef.current;
      if (!orch) throw new Error('Agent not initialized');

      // The orchestrator will emit events that our UIEventPort will handle
      // No need to manually display content - events will drive the UI updates
      await orch.send(trimmed, {conversationId: 'cli', stream: true});
    } catch (err: unknown) {
      const message = typeof err === 'object' && err !== null && 'message' in err ? (err as {message?: string}).message : String(err);
      appendLine(`error: ${message}`, 'red');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box flexDirection="column" height="100%" paddingX={1}>
      {/* Header */}
      <Box borderStyle="round" justifyContent="space-between">
        <Box>
          <Text color="cyan" bold>Nuvin AI Agent CLI</Text>
          <Box marginLeft={1}>
            <Text color="green">●</Text>
            <Text color="gray"> {status}</Text>
          </Box>
        </Box>
      </Box>

      {/* Main Chat Area */}
      <Box flexDirection="column" flexGrow={1} paddingX={1} marginBottom={1}>
        <Box flexDirection="column" minHeight={10}>
          {lines.length === 0 ? (
            <Box flexDirection="column" alignItems="center" justifyContent="center" minHeight={8}>
              <Text color="gray" dimColor>💬 Welcome! Type your message below to start chatting.</Text>
              <Text color="gray" dimColor>   Commands: '/exit' to quit, or 'exit'/'quit', Ctrl+C to force quit</Text>
              {provider === 'Echo' && (
                <Text color="yellow" dimColor>   Try: '!reverse hello world' or '!wc count these words'</Text>
              )}
            </Box>
          ) : (
            lines.map((l, i) => {
              const isUser = l.text.startsWith('> ');
              const isAssistant = l.text.startsWith('assistant: ');
              const isMeta = l.text.startsWith('meta: ');
              const isError = l.color === 'red';
              const isToolCall = l.text.includes('tool') || l.text.includes('MCP');

              // Skip meta lines - they're now shown in footer
              if (isMeta) return null;

              if (isUser) {
                return (
                  <Box key={i} marginY={0}>
                    <Text color="white" bold>● </Text>
                    <Text>{l.text.substring(2)}</Text>
                  </Box>
                );
              }

              if (isAssistant) {
                return (
                  <Box key={i} marginY={0}>
                    <Text color="green" bold>● </Text>
                    <Text>{l.text.substring(11)}</Text>
                  </Box>
                );
              }

              if (isToolCall && !isMeta && !isError) {
                return (
                  <Box key={i} marginY={0}>
                    <Text color="blue" bold>● </Text>
                    <Text>{l.text}</Text>
                  </Box>
                );
              }

              if (isError) {
                return (
                  <Box key={i}>
                    <Text color="red" bold>● </Text>
                    <Text>{l.text}</Text>
                  </Box>
                );
              }

              return (
                <Text key={i} color={l.color as any}>{l.text}</Text>
              );
            })
          )}
        </Box>
      </Box>

      {/* Input Area */}
      <Box borderStyle="round">
        {busy ? (
          <Box>
            <Box marginRight={1}>
              <Spinner type="dots" />
            </Box>
            <Text color="gray">Processing your request...</Text>
          </Box>
        ) : (
          <Box>
            <Text color="green" bold>{'>'} </Text>
            <TextInput
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              placeholder="Type your message..."
            />
          </Box>
        )}
      </Box>

      {/* Footer with model info and metadata */}
      <Box paddingX={1} paddingTop={1} justifyContent="space-between">
        <Text color="gray" dimColor>
          {provider} | {model}
        </Text>
        {lastMetadata && (
          <Text color="gray" dimColor>
            tokens: p:{lastMetadata.promptTokens ?? '-'} c:{lastMetadata.completionTokens ?? '-'} t:{lastMetadata.totalTokens ?? '-'} | cost: {lastMetadata.estimatedCost != null ? `$${Number(lastMetadata.estimatedCost).toFixed(6)}` : 'n/a'} | time: {lastMetadata.responseTime != null ? `${lastMetadata.responseTime}ms` : 'n/a'} | tools: {lastMetadata.toolCalls != null ? `${lastMetadata.toolCalls}` : '0'}
          </Text>
        )}
      </Box>
    </Box>
  );
}
