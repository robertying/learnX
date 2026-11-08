import { createLimiter } from 'helpers/limiter';

const tick = () => new Promise(resolve => setTimeout(resolve, 0));

/** A task that runs until `finish` is called. */
const pending = (log: string[], name: string) => {
  let finish!: () => void;
  const task = () =>
    new Promise<string>(resolve => {
      log.push(name);
      finish = () => resolve(name);
    });
  return { task, finish: () => finish() };
};

it('runs at most `concurrency` tasks at once', async () => {
  const limit = createLimiter(2);
  const log: string[] = [];
  const tasks = ['a', 'b', 'c'].map(name => pending(log, name));
  const results = tasks.map(t => limit(t.task));

  await tick();
  expect(log).toEqual(['a', 'b']);

  tasks[0].finish();
  await tick();
  expect(log).toEqual(['a', 'b', 'c']);

  tasks[1].finish();
  tasks[2].finish();
  expect(await Promise.all(results)).toEqual(['a', 'b', 'c']);
});

it('starts waiting tasks by priority, then in order', async () => {
  const limit = createLimiter(1);
  const log: string[] = [];
  const first = pending(log, 'first');
  const tasks = [
    ['files', 2],
    ['notices', 1],
    ['assignments 1', 0],
    ['assignments 2', 0],
  ] as const;
  void limit(first.task);
  const rest = tasks.map(([name, priority]) =>
    limit(async () => {
      log.push(name);
    }, priority),
  );

  await tick();
  first.finish();
  await Promise.all(rest);
  expect(log).toEqual([
    'first',
    'assignments 1',
    'assignments 2',
    'notices',
    'files',
  ]);
});

it('passes failures on and keeps going', async () => {
  const limit = createLimiter(1);
  const failing = limit(() => Promise.reject(new Error('no')));
  const thrown = limit(() => {
    throw new Error('sync');
  });
  const next = limit(() => Promise.resolve('ok'));
  await expect(failing).rejects.toThrow('no');
  await expect(thrown).rejects.toThrow('sync');
  expect(await next).toBe('ok');
});
