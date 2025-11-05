import type { AssignParams } from '../agent-types.js';
import type { ToolExecutionContext } from '../tools/types.js';
import type {
  AgentCatalog,
  AgentCommandRunner,
  DelegationPolicy,
  DelegationResult,
  DelegationResultFormatter,
  DelegationService,
  SpecialistAgentFactory,
} from './types.js';

const DEFAULT_DELEGATION_DEPTH = 0;

export class DefaultDelegationService implements DelegationService {
  private enabledAgents: Record<string, boolean> = {};

  constructor(
    private readonly catalog: AgentCatalog,
    private readonly policy: DelegationPolicy,
    private readonly factory: SpecialistAgentFactory,
    private readonly runner: AgentCommandRunner,
    private readonly formatter: DelegationResultFormatter,
  ) {}

  setEnabledAgents(enabledAgents: Record<string, boolean>): void {
    this.enabledAgents = enabledAgents;
  }

  listEnabledAgents() {
    return this.catalog.list().filter((agent) => !agent.id || this.enabledAgents[agent.id] !== false);
  }

  async delegate(params: AssignParams, context?: ToolExecutionContext): Promise<DelegationResult> {
    const template = this.catalog.get(params.agent);
    if (!template) {
      const availableAgents = this.catalog
        .list()
        .map((a) => a.id)
        .filter(Boolean)
        .join(', ');
      return {
        success: false,
        error: `Agent "${params.agent}" not found in registry. Available agents: ${availableAgents}`,
      };
    }

    const decision = this.policy.evaluate({
      agent: template,
      enabledAgents: this.enabledAgents,
      params,
      context,
    });

    if (!decision.allowed) {
      return {
        success: false,
        error: decision.reason ?? 'Agent delegation is not allowed.',
      };
    }

    const currentDepth =
      typeof context?.delegationDepth === 'number' ? context.delegationDepth : DEFAULT_DELEGATION_DEPTH;

    const specialistConfig = this.factory.create({
      template,
      params,
      context,
      currentDepth,
    });

    try {
      const result = await this.runner.run(specialistConfig, context);

      if (result.status === 'error' || result.status === 'timeout') {
        return {
          success: false,
          error: result.result,
        };
      }

      const { summary, metadata } = this.formatter.formatSuccess(params.agent, result);
      return {
        success: true,
        summary,
        metadata,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to execute specialist agent: ${this.formatter.formatError(error)}`,
      };
    }
  }
}
