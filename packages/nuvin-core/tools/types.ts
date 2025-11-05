import type { ToolDefinition, ToolExecutionResult, EventPort } from '../ports.js';

export type ExecResult = Omit<ToolExecutionResult, 'id' | 'name'>;

export type ToolExecutionContext = {
  conversationId?: string;
  agentId?: string;
  sessionId?: string;
  workspaceDir?: string;
  delegationDepth?: number;
  messageId?: string;
  eventPort?: EventPort;
  signal?: AbortSignal;
} & Record<string, unknown>;

export interface FunctionTool<P = Record<string, unknown>, C = ToolExecutionContext> {
  // Identifier and JSON Schema parameters for this tool
  name: string;
  parameters: object;

  // Full function definition used by LLM providers
  definition(): ToolDefinition['function'];

  // Execute the tool with provider-supplied params
  execute(params: P, context?: C): Promise<ExecResult> | ExecResult;
}
