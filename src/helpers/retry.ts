export interface RetryOptions {
  /** Calls in all, the first one included. */
  attempts?: number;
  /** Milliseconds before the second call; each later wait doubles. */
  delay?: number;
  /** Whether an error is worth another try. */
  shouldRetry?: (error: unknown) => boolean;
}

/**
 * Calls `fn` up to `attempts` times, waiting `delay`, then twice as long, and
 * so on (plus a little jitter) between them. Rejects with the last error as
 * soon as the last attempt fails, without waiting again, or right away when
 * `shouldRetry` says an error isn't worth another try.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  { attempts = 3, delay = 1000, shouldRetry = () => true }: RetryOptions = {},
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= attempts - 1 || !shouldRetry(error)) {
        throw error;
      }
    }
    const backoff = delay * Math.pow(2, attempt);
    await new Promise(resolve =>
      setTimeout(resolve, backoff + Math.random() * 100),
    );
  }
}
