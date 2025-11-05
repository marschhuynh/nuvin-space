import type { DelegationPolicy, DelegationPolicyInput, PolicyDecision } from './types.js';

/**
 * Default policy checks whether the agent is enabled (if explicitly configured).
 */
export class DefaultDelegationPolicy implements DelegationPolicy {
  evaluate(input: DelegationPolicyInput): PolicyDecision {
    const agentId = input.agent.id;
    if (!agentId) {
      return { allowed: false, reason: 'Agent is missing identifier.' };
    }

    const enabled = input.enabledAgents[agentId];
    if (enabled === false) {
      return {
        allowed: false,
        reason: `Agent "${agentId}" is currently disabled. Please enable it in the agent configuration.`,
      };
    }

    return { allowed: true };
  }
}
