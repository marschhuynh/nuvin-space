import { describe, it, expect } from 'vitest';
import { AgentRegistry } from '../agent-registry.js';
import type { AgentTemplate } from '../agent-types.js';

describe('AgentRegistry', () => {
  it('should initialize with empty agent list', () => {
    const registry = new AgentRegistry();
    const agents = registry.list();

    expect(agents.length).toBe(0);
  });

  it('should register a new agent', () => {
    const registry = new AgentRegistry();

    const customAgent: AgentTemplate = {
      id: 'custom-agent',
      name: 'Custom Agent',
      description: 'A custom test agent',
      systemPrompt: 'You are a custom agent',
      tools: ['file_read'],
    };

    registry.register(customAgent);

    expect(registry.exists('custom-agent')).toBe(true);
    const retrieved = registry.get('custom-agent');
    expect(retrieved).toMatchObject(customAgent);
    expect(retrieved?.temperature).toBe(0.7);
    expect(retrieved?.maxTokens).toBe(64000);
  });

  it('should unregister an agent', () => {
    const registry = new AgentRegistry();

    const customAgent: AgentTemplate = {
      id: 'temp-agent',
      name: 'Temporary Agent',
      description: 'A temporary agent',
      systemPrompt: 'You are temporary',
      tools: [],
    };

    registry.register(customAgent);
    expect(registry.exists('temp-agent')).toBe(true);

    registry.unregister('temp-agent');
    expect(registry.exists('temp-agent')).toBe(false);
  });

  it('should list all agents', () => {
    const registry = new AgentRegistry();

    // Initially empty
    expect(Array.isArray(registry.list())).toBe(true);
    expect(registry.list().length).toBe(0);

    // Add some agents
    registry.register({
      id: 'agent-1',
      name: 'Agent 1',
      systemPrompt: 'Test agent 1',
    });
    registry.register({
      id: 'agent-2',
      name: 'Agent 2',
      systemPrompt: 'Test agent 2',
    });

    const agents = registry.list();
    expect(agents.length).toBe(2);
    const ids = agents.map((a) => a.id);
    expect(ids).toContain('agent-1');
    expect(ids).toContain('agent-2');
  });

  it('should return undefined for non-existent agent', () => {
    const registry = new AgentRegistry();
    const agent = registry.get('non-existent');

    expect(agent).toBeUndefined();
  });

  it('should validate agent templates', () => {
    const registry = new AgentRegistry();

    const invalidAgent = {
      id: 'invalid',
    } as AgentTemplate;

    expect(() => registry.register(invalidAgent)).toThrow(/systemPrompt/);
  });

  it('should get agent with all properties', () => {
    const registry = new AgentRegistry();

    // Register an agent
    registry.register({
      id: 'test-agent',
      name: 'Test Agent',
      description: 'A test agent',
      systemPrompt: 'You are a test agent',
      tools: ['file_read', 'web_search'],
    });

    const agent = registry.get('test-agent');

    expect(agent).toBeDefined();
    expect(agent?.id).toBe('test-agent');
    expect(agent?.name).toBe('Test Agent');
    expect(agent?.description).toBe('A test agent');
    expect(agent?.systemPrompt).toBe('You are a test agent');
    expect(Array.isArray(agent?.tools)).toBe(true);
    expect(agent?.tools).toEqual(['file_read', 'web_search']);
  });
});
