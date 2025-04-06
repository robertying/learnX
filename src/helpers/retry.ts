export async function retry(
  fn: () => Promise<any>,
  retries = 3,
  delay = 1000,
  err: Error | null = null,
): Promise<any> {
  if (retries === 0) {
    return Promise.reject(err);
  }

  return fn().catch(async (err: Error) => {
    const backoff = delay * Math.pow(2, 3 - retries);
    const jitter = Math.random() * 100;

    return new Promise(resolve => setTimeout(resolve, backoff + jitter)).then(
      () => retry(fn, retries - 1, delay, err),
    );
  });
}
