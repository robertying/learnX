/**
 * Runs the tasks handed to it at most `concurrency` at a time. Waiting tasks
 * start lowest `priority` first, and in the order they came within a
 * priority.
 */
export const createLimiter = (concurrency: number) => {
  let running = 0;
  let order = 0;
  const waiting: { priority: number; order: number; start: () => void }[] = [];

  const startNext = () => {
    while (running < concurrency && waiting.length > 0) {
      waiting.sort((a, b) => a.priority - b.priority || a.order - b.order);
      running++;
      waiting.shift()!.start();
    }
  };

  return <T>(task: () => Promise<T>, priority = 0) =>
    new Promise<T>((resolve, reject) => {
      waiting.push({
        priority,
        order: order++,
        start: () => {
          void Promise.resolve()
            .then(task)
            .then(resolve, reject)
            .finally(() => {
              running--;
              startNext();
            });
        },
      });
      startNext();
    });
};
