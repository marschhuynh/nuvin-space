import type { ToolDefinition } from '../ports.js';
import { ErrorReason } from '../ports.js';
import type { FunctionTool, ToolExecutionContext, ExecResultError } from './types.js';
import { okText, err } from './result-helpers.js';
import type { AssignParams } from '../agent-types.js';
import type { DelegationService } from '../delegation/types.js';
import type { DelegationMetadata } from './metadata-types.js';

export type AssignSuccessResult = {
  status: 'success';
  type: 'text';
  result: string;
  metadata: DelegationMetadata;
};

export type AssignErrorResult = ExecResultError & {
  metadata?: {
    agentId?: string;
    errorReason?: ErrorReason;
    delegationDepth?: number;
    policyDenied?: boolean;
    agentNotFound?: boolean;
  };
};

export type AssignResult = AssignSuccessResult | AssignErrorResult;

export class AssignTool implements FunctionTool<AssignParams, ToolExecutionContext, AssignResult> {
  name = 'assign_task';
  parameters = {
    type: 'object',
    properties: {
      description: {
        type: 'string',
        description:
          'A summary of the task to be performed by the delegated agent. Be specific about the desired outcome. From 5-10 words.',
      },
      agent: {
        type: 'string',
        description: 'Agent ID from registry (e.g., "code-reviewer", "researcher")',
      },
      task: {
        type: 'string',
        description: 'Detailed description of the task to be performed by the agent.',
      },
    },
    required: ['agent', 'task', 'description'],
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
   * Delegate a task to a specialist agent for focused execution
   *
   * @param params - Agent ID and task description to delegate
   * @param context - Execution context including delegation depth tracking
   * @returns Delegation result with comprehensive metrics including cost breakdown
   *
   * @example
   * ```typescript
   * const result = await assignTool.execute({
   *   agent: 'code-reviewer',
   *   task: 'Review the changes in src/tools/*.ts',
   *   description: 'Code review of tool implementations'
   * });
   * if (result.status === 'success' && result.type === 'text') {
   *   console.log(result.result); // Agent's response
   *   console.log(result.metadata.metrics?.totalCost); // Cost in USD
   *   console.log(result.metadata.executionTimeMs); // Duration
   *   console.log(result.metadata.toolCallsExecuted); // Number of tool calls
   * }
   * ```
   */
  async execute(params: AssignParams, context?: ToolExecutionContext): Promise<AssignResult> {
    if (!params.agent || typeof params.agent !== 'string') {
      return err('Parameter "agent" is required and must be a string', undefined, ErrorReason.InvalidInput);
    }

    if (!params.task || typeof params.task !== 'string') {
      return err('Parameter "task" is required and must be a string', undefined, ErrorReason.InvalidInput);
    }

    const outcome = await this.delegationService.delegate(params, context);
    if (!outcome.success || !outcome.summary) {
      const isNotFound = outcome.error?.includes('not found');
      const isPolicyDenied = outcome.error?.includes('policy') || outcome.error?.includes('denied');
      return err(
        outcome.error ?? 'Failed to delegate task.',
        {
          agentId: params.agent,
          agentNotFound: isNotFound,
          policyDenied: isPolicyDenied,
          delegationDepth: context?.delegationDepth,
        },
        ErrorReason.Unknown,
      );
    }

    const metadata = outcome.metadata as DelegationMetadata;
    return okText(outcome.summary, {
      ...metadata,
      taskDescription: params.task,
      delegationDepth: (context?.delegationDepth ?? 0) + 1,
    });
  }
}
