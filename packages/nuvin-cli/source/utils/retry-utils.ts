import { isRetryableError } from './error-classification.js';

export interface RetryOptions {
  maxRetries: number;
  delayMs: number;
  onRetry?: (attempt: number, error: Error, remainingSeconds: number) => void;
  onNonRetryable?: (error: Error) => void;
  signal?: AbortSignal;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Custom error class to distinguish user-initiated aborts from other failures.
 * This allows proper handling of ESC key aborts without triggering retry logic.
 */
export class AbortError extends Error {
  constructor(message = 'Operation aborted by user') {
    super(message);
    this.name = 'AbortError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AbortError);
    }
  }
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const { maxRetries, delayMs, onRetry, onNonRetryable, signal } = options;
  let lastError: Error | undefined;

  if (signal?.aborted) {
    throw new AbortError('Operation aborted before execution');
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (lastError instanceof AbortError || lastError.name === 'AbortError') {
        throw lastError;
      }

      if (signal?.aborted) {
        throw new AbortError('Operation aborted during retry');
      }

      if (!isRetryableError(lastError)) {
        onNonRetryable?.(lastError);
        throw lastError;
      }

      if (attempt === maxRetries) {
        break;
      }

      const remainingSeconds = Math.ceil(delayMs / 1000);
      onRetry?.(attempt + 1, lastError, remainingSeconds);

      if (signal?.aborted) {
        throw new AbortError('Operation aborted during retry delay');
      }

      await sleep(delayMs);
    }
  }

  throw lastError || new Error('Retry failed');
}
