export function retry(fn: Function, retries = 3, err: Error | null = null) {
  if (!retries) {
    return Promise.reject(err);
  }
  return fn().catch((err: Error) => {
    return retry(fn, retries - 1, err);
  });
}
