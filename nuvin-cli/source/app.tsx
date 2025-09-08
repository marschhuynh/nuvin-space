import React, {useEffect, useRef, useState, useMemo} from 'react';
import {Box, Text, useApp, useInput} from 'ink';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {randomUUID} from 'node:crypto';

// Core imports from the monorepo
import {AgentOrchestrator} from '../../nuvin-core/orchestrator.js';
import {SimpleContextBuilder} from '../../nuvin-core/context.js';
import {InMemoryMemory, PersistedMemory, JsonFileMemoryPersistence} from '../../nuvin-core/memory.js';
import type {Message} from '../../nuvin-core/ports.js';
import {SimpleId} from '../../nuvin-core/id.js';
import {SystemClock} from '../../nuvin-core/clock.js';
import {SimpleCost} from '../../nuvin-core/cost.js';
import {NoopReminders} from '../../nuvin-core/reminders.js';
import {ToolRegistry} from '../../nuvin-core/tools.js';
import {EchoLLM} from '../../nuvin-core/llm-echo.js';
import {GithubLLM} from '../../nuvin-core/llm-github.js';
import {OpenRouterLLM} from '../../nuvin-core/llm-openrouter.js';
import {FetchTransport} from '../../nuvin-core/transport.js';
import {GithubAuthTransport} from '../../nuvin-core/auth-transport.js';
import {CoreMCPClient} from '../../nuvin-core/mcp-client.js';
import {MCPToolPort} from '../../nuvin-core/mcp-tools.js';
import {CompositeToolPort} from '../../nuvin-core/tools-composite.js';
import {loadMCPConfig} from '../../nuvin-core/config.js';
import {PersistingConsoleEventPort} from '../../nuvin-core/events.js';
import type {TodoItem as StoreTodo} from '../../nuvin-core/todo-store.js';

type Props = {
  useOpenRouter?: boolean;
  useGithub?: boolean;
  memPersist?: boolean;
  mcpConfigPath?: string;
};

type Line = {text: string; color?: string};

export default function App({useOpenRouter = false, useGithub = false, memPersist = false, mcpConfigPath}: Props) {
  const {exit} = useApp();
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>('Initializing...');
  const orchestratorRef = useRef<AgentOrchestrator | null>(null);
  const [provider, setProvider] = useState<'OpenRouter' | 'GitHub' | 'Echo'>('Echo');
  const [model, setModel] = useState<string>('demo-echo');

  // Initialize a session directory inside .history/<uuid> on first render
  const sessionId = useMemo(() => randomUUID(), []);
  const sessionDir = useMemo(() => path.join('.history', sessionId), [sessionId]);

  useEffect(() => {
    let didCancel = false;

    (async () => {
      // Ensure session directory exists
      try {
        fs.mkdirSync(sessionDir, {recursive: true});
      } catch {}

      // Provider selection
      const baseTransport = new FetchTransport();
      const authTransport = new GithubAuthTransport(baseTransport, {
        apiKey: process.env.GITHUB_COPILOT_API_KEY || undefined,
        accessToken: process.env.GITHUB_ACCESS_TOKEN || undefined,
      });

      const selectedProvider = useOpenRouter ? 'OpenRouter' : useGithub ? 'GitHub' : 'Echo';
      setProvider(selectedProvider);

      const llm = useOpenRouter
        ? new OpenRouterLLM(baseTransport, String(process.env.OPENROUTER_API_KEY || ''))
        : useGithub
        ? new GithubLLM(authTransport)
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
              if (serverCfg.transport === 'http' && serverCfg.url) {
                client = new CoreMCPClient({type: 'http', url: serverCfg.url, headers: serverCfg.headers});
              } else if (serverCfg.command) {
                client = new CoreMCPClient({type: 'stdio', command: serverCfg.command, args: serverCfg.args, env: serverCfg.env});
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
                enabledTools.push(...exposed);
                appendLine(`MCP server '${serverId}' loaded with ${exposed.length} tools (prefix='${prefix}').`, 'green');
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
          systemPrompt: 'You are a concise assistant. Use tools when appropriate.',
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
          events: new PersistingConsoleEventPort({filename: path.join(sessionDir, '.nuvin_events.json')}),
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useOpenRouter, useGithub, memPersist, mcpConfigPath]);

  const appendLine = (text: string, color?: string) => setLines(prev => [...prev, {text, color}]);

  const handleSubmit = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (trimmed.toLowerCase() === 'exit' || trimmed.toLowerCase() === 'quit') {
      appendLine('Bye!');
      exit();
      return;
    }

    appendLine(`> ${trimmed}`, 'cyan');
    setInput('');
    setBusy(true);
    try {
      const orch = orchestratorRef.current;
      if (!orch) throw new Error('Agent not initialized');
      const resp = await orch.send(trimmed, {conversationId: 'cli'});
      appendLine(`assistant: ${resp.content}`);
      const md: any = resp.metadata || {};
      const tokens = `p:${md.promptTokens ?? '-'} c:${md.completionTokens ?? '-'} t:${md.totalTokens ?? '-'}`;
      const cost = md.estimatedCost != null ? `$${Number(md.estimatedCost).toFixed(6)}` : 'n/a';
      const time = md.responseTime != null ? `${md.responseTime}ms` : 'n/a';
      const tools = md.toolCalls != null ? `${md.toolCalls}` : '0';
      appendLine(`meta: tokens ${tokens} | cost ${cost} | time ${time} | tools ${tools}`, 'gray');
    } catch (err: unknown) {
      const message = typeof err === 'object' && err !== null && 'message' in err ? (err as {message?: string}).message : String(err);
      appendLine(`error: ${message}`, 'red');
    } finally {
      setBusy(false);
    }
  };

  useInput((inputKey, key) => {
    if (key.ctrl && inputKey === 'c') {
      exit();
      return;
    }
    if (key.return) {
      if (!busy) void handleSubmit(input);
      return;
    }
    if (key.backspace || key.delete) {
      setInput(prev => prev.slice(0, -1));
      return;
    }
    if (key.tab || key.leftArrow || key.rightArrow || key.upArrow || key.downArrow) {
      return; // ignore navigation keys
    }
    // Append printable chars
    if (typeof inputKey === 'string') setInput(prev => prev + inputKey);
  });

  return (
    <Box flexDirection="column">
      <Text>I want go get information about the current system, the info include, current time, type of os, how much disk space left, saperating each work into a task and collect the result for me</Text>
      <Box><Text color="gray">{status}</Text></Box>
      {lines.map((l, i) => (
        <Text key={i} color={l.color as any}>{l.text}</Text>
      ))}
      <Box>
        <Text color="green">{busy ? '… ' : '> '}</Text>
        <Text>{input}</Text>
        {busy && <Text color="yellow"> (thinking)</Text>}
      </Box>
      <Box>
        <Text color="gray">Provider: {provider} | Model: {model}</Text>
      </Box>
    </Box>
  );
}
