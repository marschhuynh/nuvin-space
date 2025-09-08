import type { ToolDefinition, ToolExecutionResult } from '../ports';

export type ExecResult = Omit<ToolExecutionResult, 'id' | 'name'>;

export type ToolExecutionContext = {
  conversationId?: string;
  agentId?: string;
  sessionId?: string;
} & Record<string, unknown>;

export interface FunctionTool<P = Record<string, unknown>, C = Record<string, unknown>> {
  // Identifier and JSON Schema parameters for this tool
  name: string;
  parameters: object;

  // Full function definition used by LLM providers
  definition(): ToolDefinition['function'];

  // Execute the tool with provider-supplied params
  execute(params: P, context?: C): Promise<ExecResult> | ExecResult;
}
