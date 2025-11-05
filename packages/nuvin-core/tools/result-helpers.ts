import type { ExecResult } from './types.js';

/**
 * Creates a successful execution result
 */
export function ok(result: string | object, metadata?: Record<string, unknown>): ExecResult {
  return { status: 'success', type: 'text', result, metadata };
}

/**
 * Creates an error execution result
 */
export function err(result: string | object, metadata?: Record<string, unknown>): ExecResult {
  return { status: 'error', type: 'text', result, metadata };
}
