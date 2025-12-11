/**
 * Promise utilities for handling async operations with timeout and cancellation
 */

/**
 * Wraps a promise with timeout functionality
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param operationName - Name of the operation for error messages
 * @returns Promise that resolves with original or rejects with timeout error
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string = 'Operation',
): Promise<T> {
  let timeoutId: NodeJS.Timeout | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  });
}

/**
 * Creates an abortable promise wrapper
 * @param promise - The promise to make abortable
 * @param abortController - AbortController to handle cancellation
 * @param onCancel - Optional callback to run on cancellation
 * @returns Abortable promise
 */
export function makeAbortable<T>(
  promise: Promise<T>,
  abortController: AbortController,
  onCancel?: () => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const cleanup = () => {
      abortController.signal.removeEventListener('abort', handleAbort);
    };

    const handleAbort = () => {
      cleanup();
      onCancel?.();
      reject(new Error('Operation was cancelled'));
    };

    if (abortController.signal.aborted) {
      handleAbort();
      return;
    }

    abortController.signal.addEventListener('abort', handleAbort);

    promise
      .then((result) => {
        cleanup();
        resolve(result);
      })
      .catch((error) => {
        cleanup();
        reject(error);
      });
  });
}

/**
 * Retry a function with exponential backoff
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries
 * @param baseDelayMs - Base delay in milliseconds
 * @returns Result of the function or last error
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff with jitter
      const delay =
        baseDelayMs * Math.pow(2, attempt) * (1 + Math.random() * 0.1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
