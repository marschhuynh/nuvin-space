import type { ExecResult } from './types.js';
import type { ErrorReason } from '../ports.js';

/**
 * Creates a successful execution result
 */
export function ok(result: string | object, metadata?: Record<string, unknown>): ExecResult {
  return { status: 'success', type: 'text', result, metadata };
}

/**
 * Creates an error execution result with optional error reason
 */
export function err(
  result: string | object,
  metadata?: Record<string, unknown>,
  errorReason?: ErrorReason,
): ExecResult {
  const finalMetadata = errorReason ? { ...metadata, errorReason } : metadata;
  return { status: 'error', type: 'text', result, metadata: finalMetadata };
}
