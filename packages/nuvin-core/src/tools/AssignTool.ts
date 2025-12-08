import type { ToolDefinition } from '../ports.js';
import type { FunctionTool, ExecResult, ToolExecutionContext } from './types.js';
import type { AssignParams } from '../agent-types.js';
import type { DelegationService } from '../delegation/types.js';
import { ok, err } from './result-helpers.js';

/**
 * AssignTool - delegates tasks to specialist agents
 */
export class AssignTool implements FunctionTool<AssignParams, ToolExecutionContext> {
  name = 'assign_task';
  parameters = {
    type: 'object',
    properties: {
      description: {
        type: 'string',
        description:
          'Explanation of why this task is being delegated (e.g., "Delegate code review to specialist agent")',
      },
      agent: {
        type: 'string',
        description: 'Agent ID from registry (e.g., "code-reviewer", "researcher")',
      },
      task: {
        type: 'string',
        description: 'Task description explaining what to do',
      },
    },
    required: ['agent', 'task'],
  } as const;

  constructor(private readonly delegationService: DelegationService) {}

  /**
   * Update the enabled agents configuration
   */
  setEnabledAgents(enabledAgents: Record<string, boolean>): void {
    this.delegationService.setEnabledAgents(enabledAgents);
  }

  /**
   * Generate dynamic description based on current registry
   * Only shows enabled agents
   */
  definition(): ToolDefinition['function'] {
    const enabledAgents = this.delegationService.listEnabledAgents();
    const agentList = enabledAgents.map((a) => `- ${a.id}: ${a.description ?? 'No description provided'}`).join('\n');

    return {
      name: this.name,
      description: `Delegate a task to a specialist agent for focused, independent execution.

Available agents:
${agentList}`,
      parameters: this.parameters,
    };
  }

  /**
   * Execute task delegation
   */
  async execute(params: AssignParams, context?: ToolExecutionContext): Promise<ExecResult> {
    // Validate parameters
    if (!params.agent || typeof params.agent !== 'string') {
      return err('Parameter "agent" is required and must be a string');
    }

    if (!params.task || typeof params.task !== 'string') {
      return err('Parameter "task" is required and must be a string');
    }

    // Look up agent template
    const outcome = await this.delegationService.delegate(params, context);
    if (!outcome.success || !outcome.summary) {
      return err(outcome.error ?? 'Failed to delegate task.');
    }

    return ok(outcome.summary, outcome.metadata);
  }
}
