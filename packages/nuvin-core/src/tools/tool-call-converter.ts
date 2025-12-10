import type { ToolCall, ToolInvocation } from '../ports.js';
import type { ToolName } from './tool-params.js';
import { parseJSON } from './tool-call-parser.js';
import { toolValidators } from './tool-validators.js';

export type ToolCallValidation =
  | {
      valid: true;
      invocation: ToolInvocation;
    }
  | {
      valid: false;
      error: string;
      errorType: 'parse' | 'validation' | 'unknown';
      callId: string;
      toolName: string;
      rawArguments?: string;
    };

export function convertToolCall(toolCall: ToolCall, options: { strict?: boolean } = {}): ToolCallValidation {
  const { strict = false } = options;

  const parseResult = parseJSON(toolCall.function.arguments);

  if (!parseResult.success) {
    return {
      valid: false,
      error: parseResult.error,
      errorType: 'parse',
      callId: toolCall.id,
      toolName: toolCall.function.name,
      rawArguments: toolCall.function.arguments,
    };
  }

  const toolName = toolCall.function.name;
  const parameters = parseResult.data;

  const validator = toolValidators[toolName as ToolName];

  if (validator) {
    const validationResult = validator(parameters);

    if (!validationResult.valid) {
      if (strict) {
        return {
          valid: false,
          error: `Validation failed: ${validationResult.errors.join('; ')}`,
          errorType: 'validation',
          callId: toolCall.id,
          toolName: toolCall.function.name,
          rawArguments: toolCall.function.arguments,
        };
      }
      console.warn(`[ToolCallConverter] Validation warnings for ${toolName}:`, validationResult.errors);
    }
  }

  return {
    valid: true,
    invocation: {
      id: toolCall.id,
      name: toolCall.function.name,
      parameters,
    },
  };
}

export function convertToolCalls(
  toolCalls: ToolCall[],
  options: { strict?: boolean; throwOnError?: boolean } = {},
): ToolInvocation[] {
  const { strict = false, throwOnError = true } = options;
  const invocations: ToolInvocation[] = [];

  for (const tc of toolCalls) {
    const result = convertToolCall(tc, { strict });

    if (!result.valid) {
      const errorMsg = `Tool call ${result.callId} (${result.toolName}): ${result.error}`;

      if (throwOnError) {
        throw new Error(errorMsg);
      }

      console.error(`[ToolCallConverter] ${errorMsg}`);
      invocations.push({
        id: result.callId,
        name: result.toolName,
        parameters: {},
      });
    } else {
      invocations.push(result.invocation);
    }
  }

  return invocations;
}
