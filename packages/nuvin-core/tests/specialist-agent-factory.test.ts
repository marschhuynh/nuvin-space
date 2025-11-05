import { describe, expect, it } from 'vitest';
import { DefaultSpecialistAgentFactory } from '../delegation/DefaultSpecialistAgentFactory.js';
import type { AgentTemplate, AssignParams } from '../agent-types.js';

const template: AgentTemplate = {
  id: 'analyst',
  name: 'Analyst',
  description: 'Analyzes data',
  systemPrompt: 'You are an analyst.\n{{injectedSystem}}',
  tools: ['file_read'],
};

const params: AssignParams = {
  agent: 'analyst',
  task: 'Summarize findings',
};

describe('DefaultSpecialistAgentFactory', () => {
  it('builds specialist config with injected system context and deterministic id', () => {
    const factory = new DefaultSpecialistAgentFactory({
      systemContextProvider: () => ({
        timeISO: '2025-01-01T00:00:00.000Z',
        platform: 'darwin',
        arch: 'arm64',
        tempDir: '/tmp',
        workspaceDir: '/workspace',
      }),
      idGenerator: () => 'custom-id',
    });

    const config = factory.create({ template, params, context: undefined, currentDepth: 2 });

    expect(config.agentId).toBe('custom-id');
    expect(config.agentName).toBe('Analyst');
    expect(config.taskDescription).toBe(params.task);
    expect(config.delegationDepth).toBe(3);
    expect(config.tools).toEqual(['file_read']);
    expect(config.systemPrompt).toContain('You are an analyst.');
    expect(config.systemPrompt).toContain("System info:\n- Today's date: 2025-01-01T00:00:00.000Z");
  });

  it('falls back to sensible defaults when optional template fields are missing', () => {
    const factory = new DefaultSpecialistAgentFactory({ idGenerator: () => 'id-123' });

    const minimalTemplate: AgentTemplate = {
      systemPrompt: 'Just do it',
    };

    const config = factory.create({ template: minimalTemplate, params, context: undefined, currentDepth: 0 });

    expect(config.agentId).toBe('id-123');
    expect(config.agentName).toBe(params.agent);
    expect(config.tools).toEqual([]);
    expect(config.delegationDepth).toBe(1);
  });
});
