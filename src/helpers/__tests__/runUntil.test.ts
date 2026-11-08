import { runUntil } from 'helpers/runUntil';

const after = <T>(ms: number, value: T) =>
  new Promise<T>(resolve => setTimeout(() => resolve(value), ms));

it('runs every task in order, at most `concurrency` at a time', async () => {
  let running = 0;
  let most = 0;
  const started: number[] = [];
  const tasks = [0, 1, 2, 3, 4].map(i => async () => {
    started.push(i);
    running++;
    most = Math.max(most, running);
    await after(5, null);
    running--;
    if (i === 3) {
      throw new Error('no');
    }
    return i;
  });

  const results = await runUntil(tasks, {
    concurrency: 2,
    deadline: Date.now() + 1000,
  });

  expect(started).toEqual([0, 1, 2, 3, 4]);
  expect(most).toBe(2);
  expect(results.map(r => r?.status)).toEqual([
    'fulfilled',
    'fulfilled',
    'fulfilled',
    'rejected',
    'fulfilled',
  ]);
});

it('resolves at the deadline without the tasks still running', async () => {
  const started: number[] = [];
  const tasks = [0, 1, 2].map(i => () => {
    started.push(i);
    return i === 0 ? new Promise<number>(() => {}) : after(5, i);
  });

  const results = await runUntil(tasks, {
    concurrency: 1,
    deadline: Date.now() + 30,
  });

  expect(started).toEqual([0]);
  expect(results).toEqual([undefined, undefined, undefined]);
});

it('drops results that come in after the deadline', async () => {
  const results = await runUntil([() => after(5, 'a'), () => after(60, 'b')], {
    concurrency: 2,
    deadline: Date.now() + 30,
  });
  await after(50, null);
  expect(results).toEqual([{ status: 'fulfilled', value: 'a' }, undefined]);
});

it('starts nothing once the deadline has passed', async () => {
  const task = jest.fn(() => Promise.resolve(1));
  expect(
    await runUntil([task], { concurrency: 1, deadline: Date.now() - 1 }),
  ).toEqual([undefined]);
  expect(task).not.toHaveBeenCalled();
});
