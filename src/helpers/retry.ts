/**
 * Calls `fn` up to `retries` times, waiting `delay`, then twice as long, and
 * so on (plus a little jitter) between attempts. Rejects with the last error
 * as soon as the last attempt fails, without waiting again, or right away
 * when `shouldRetry` says an error isn't worth another try.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000,
  shouldRetry: (error: unknown) => boolean = () => true,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= retries - 1 || !shouldRetry(error)) {
        throw error;
      }
    }
    const backoff = delay * Math.pow(2, attempt);
    await new Promise(resolve =>
      setTimeout(resolve, backoff + Math.random() * 100),
    );
  }
}
