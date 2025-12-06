import { describe, expect, it, vi } from 'vitest';
import { DefaultDelegationService } from '../delegation/DefaultDelegationService.js';
import type {
  AgentCatalog,
  AgentCommandRunner,
  DelegationPolicy,
  DelegationResultFormatter,
  SpecialistAgentFactory,
} from '../delegation/types.js';
import type { AssignParams, SpecialistAgentConfig, SpecialistAgentResult, AgentTemplate } from '../agent-types.js';

const createCatalog = (agents: AgentTemplate[]): AgentCatalog => ({
  list: () => agents,
  get: (agentId: string) => agents.find((agent) => agent.id === agentId),
});

describe('DefaultDelegationService', () => {
  const agent: AgentTemplate = {
    id: 'researcher',
    name: 'Researcher',
    description: 'Does research',
    systemPrompt: 'Prompt',
    tools: ['web_search'],
  };

  const params: AssignParams = {
    agent: 'researcher',
    task: 'Investigate the topic',
  };

  const context = {};

  const createDeps = () => {
    const policy: DelegationPolicy = {
      evaluate: vi.fn(() => ({ allowed: true })),
    };

    const factory: SpecialistAgentFactory = {
      create: vi.fn(() => ({
        agentId: 'researcher-1',
        agentName: 'Researcher',
        systemPrompt: 'Prompt',
        taskDescription: params.task,
        tools: ['web_search'],
        delegationDepth: 1,
        shareContext: false,
      }) as unknown as SpecialistAgentConfig),
    };

    const runner: AgentCommandRunner = {
      run: vi.fn(async () => ({
        status: 'success',
        result: 'All done',
        metadata: {
          agentId: 'researcher-1',
          executionTimeMs: 100,
          toolCallsExecuted: 2,
        },
      } satisfies SpecialistAgentResult)),
    };

    const formatter: DelegationResultFormatter = {
      formatSuccess: vi.fn(() => ({
        summary: 'Task completed',
        metadata: { status: 'success' },
      })),
      formatError: vi.fn((error) => (error instanceof Error ? error.message : String(error))),
    };

    return { policy, factory, runner, formatter };
  };

  it('delegates successfully when policy allows', async () => {
    const deps = createDeps();
    const service = new DefaultDelegationService(
      createCatalog([agent]),
      deps.policy,
      deps.factory,
      deps.runner,
      deps.formatter,
    );

    const result = await service.delegate(params, context);

    expect(result.success).toBe(true);
    expect(result.summary).toBe('Task completed');
    expect(result.metadata).toEqual({ status: 'success' });

    expect(deps.policy.evaluate).toHaveBeenCalled();
    expect(deps.factory.create).toHaveBeenCalled();
    expect(deps.runner.run).toHaveBeenCalled();
    expect(deps.formatter.formatSuccess).toHaveBeenCalled();
  });

  it('returns error when agent not found', async () => {
    const deps = createDeps();
    const service = new DefaultDelegationService(
      createCatalog([]),
      deps.policy,
      deps.factory,
      deps.runner,
      deps.formatter,
    );

    const result = await service.delegate(params, context);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Agent "researcher" not found/);
    expect(deps.policy.evaluate).not.toHaveBeenCalled();
  });

  it('returns error when policy denies delegation', async () => {
    const deps = createDeps();
    deps.policy.evaluate = vi.fn(() => ({ allowed: false, reason: 'Disabled' }));

    const service = new DefaultDelegationService(
      createCatalog([agent]),
      deps.policy,
      deps.factory,
      deps.runner,
      deps.formatter,
    );

    const result = await service.delegate(params, context);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Disabled');
    expect(deps.runner.run).not.toHaveBeenCalled();
  });

  it('formats errors thrown by runner', async () => {
    const deps = createDeps();
    deps.runner.run = vi.fn(async () => {
      throw new Error('boom');
    });

    const service = new DefaultDelegationService(
      createCatalog([agent]),
      deps.policy,
      deps.factory,
      deps.runner,
      deps.formatter,
    );

    const result = await service.delegate(params, context);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Failed to execute specialist agent: boom/);
    expect(deps.formatter.formatError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('filters disabled agents when listing', () => {
    const deps = createDeps();
    const service = new DefaultDelegationService(
      createCatalog([agent]),
      deps.policy,
      deps.factory,
      deps.runner,
      deps.formatter,
    );

    service.setEnabledAgents({ researcher: false });
    const enabledAgents = service.listEnabledAgents();

    expect(enabledAgents).toHaveLength(0);

    service.setEnabledAgents({ researcher: true });
    const enabledAgain = service.listEnabledAgents();

    expect(enabledAgain).toHaveLength(1);
  });
});
