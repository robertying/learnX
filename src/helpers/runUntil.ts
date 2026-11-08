/**
 * Runs `tasks` in order, at most `concurrency` at a time, starting none once
 * `deadline` (a `Date.now()` time) has passed. Resolves when they have all
 * settled or at the deadline, whichever comes first, with each task's result,
 * or `undefined` for one that didn't finish in time. Tasks still running at
 * the deadline are left to finish on their own; their results are dropped.
 */
export const runUntil = async <T>(
  tasks: readonly (() => Promise<T>)[],
  { concurrency, deadline }: { concurrency: number; deadline: number },
): Promise<(PromiseSettledResult<T> | undefined)[]> => {
  const results: (PromiseSettledResult<T> | undefined)[] = Array.from(
    { length: tasks.length },
    () => undefined,
  );
  let next = 0;
  let late = false;

  const worker = async () => {
    while (next < tasks.length && !late && Date.now() < deadline) {
      const index = next++;
      let result: PromiseSettledResult<T>;
      try {
        result = { status: 'fulfilled', value: await tasks[index]() };
      } catch (reason) {
        result = { status: 'rejected', reason };
      }
      if (!late) {
        results[index] = result;
      }
    }
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>(resolve => {
    timer = setTimeout(
      () => {
        late = true;
        resolve();
      },
      Math.max(0, deadline - Date.now()),
    );
  });
  const workers = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    worker,
  );
  await Promise.race([Promise.all(workers), timeout]);
  clearTimeout(timer);
  late = true;
  return results;
};
