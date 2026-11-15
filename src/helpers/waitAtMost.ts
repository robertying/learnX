/**
 * Waits for `promise`, but no longer than `ms`: resolves to its value, or to
 * undefined once `ms` has passed, and rejects if it rejects first. The work
 * itself isn't stopped; whatever it does after that is no longer waited for.
 */
export async function waitAtMost<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<undefined>(resolve => {
        timer = setTimeout(resolve, Math.max(0, ms));
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
