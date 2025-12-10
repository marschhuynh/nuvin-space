import type { ToolDefinition, EventPort, ErrorReason } from '../ports.js';

export type ExecResultSuccess =
  | {
      status: 'success';
      type: 'text';
      result: string;
      metadata?: Record<string, unknown>;
    }
  | {
      status: 'success';
      type: 'json';
      result: Record<string, unknown> | unknown[];
      metadata?: Record<string, unknown>;
    };

export type ExecResultError = {
  status: 'error';
  type: 'text';
  result: string;
  metadata?: Record<string, unknown> & {
    errorReason?: ErrorReason;
  };
};

export type ExecResult = ExecResultSuccess | ExecResultError;

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

export interface FunctionTool<
  P = Record<string, unknown>,
  C = ToolExecutionContext,
  R extends ExecResult = ExecResult,
> {
  name: string;
  parameters: object;

  definition(): ToolDefinition['function'];

  execute(params: P, context?: C): Promise<R> | R;
}
