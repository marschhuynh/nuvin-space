import type { AssignParams, SpecialistAgentConfig, SpecialistAgentResult, AgentTemplate } from '../agent-types.js';
import type { ToolExecutionContext } from '../tools/types.js';

export interface AgentCatalog {
  list(): AgentTemplate[];
  get(agentId: string): AgentTemplate | undefined;
}

export interface DelegationPolicyInput {
  agent: AgentTemplate;
  enabledAgents: Record<string, boolean>;
  params: AssignParams;
  context?: ToolExecutionContext;
}

export interface PolicyDecision {
  allowed: boolean;
  reason?: string;
}

export interface DelegationPolicy {
  evaluate(input: DelegationPolicyInput): PolicyDecision;
}

export interface SpecialistAgentFactoryInput {
  template: AgentTemplate;
  params: AssignParams;
  context?: ToolExecutionContext;
  currentDepth: number;
}

export interface SpecialistAgentFactory {
  create(input: SpecialistAgentFactoryInput): SpecialistAgentConfig;
}

export interface AgentCommandRunner {
  run(config: SpecialistAgentConfig, context?: ToolExecutionContext): Promise<SpecialistAgentResult>;
}

export interface DelegationResult {
  success: boolean;
  summary?: string;
  metadata?: Record<string, unknown>;
  error?: string;
}

export interface DelegationResultFormatter {
  formatSuccess(agentId: string, result: SpecialistAgentResult): Pick<DelegationResult, 'summary' | 'metadata'>;
  formatError(error: unknown): string;
}

export interface DelegationService {
  setEnabledAgents(enabledAgents: Record<string, boolean>): void;
  listEnabledAgents(): AgentTemplate[];
  delegate(params: AssignParams, context?: ToolExecutionContext): Promise<DelegationResult>;
}
