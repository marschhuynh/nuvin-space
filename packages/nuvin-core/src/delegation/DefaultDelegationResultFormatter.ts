import type { SpecialistAgentResult } from '../agent-types.js';
import type { DelegationResultFormatter } from './types.js';

export class DefaultDelegationResultFormatter implements DelegationResultFormatter {
  formatSuccess(agentId: string, result: SpecialistAgentResult) {
    return {
      summary: result.result,
      metadata: {
        agentId: agentId,
        agentName: result.metadata.agentName,
        status: result.status,
        executionTimeMs: result.metadata.executionTimeMs,
        toolCallsExecuted: result.metadata.toolCallsExecuted,
        tokensUsed: result.metadata.tokensUsed,
        metrics: result.metadata.metrics,
      },
    };
  }

  formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
