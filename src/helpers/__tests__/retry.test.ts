import { retry } from 'helpers/retry';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('retry', () => {
  it('returns the first result that works', async () => {
    const fn = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(new Error('1'))
      .mockResolvedValueOnce('ok');
    const result = retry(fn);
    await jest.advanceTimersByTimeAsync(1100);
    await expect(result).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('rejects with the last error right after the last attempt', async () => {
    const fn = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(new Error('1'))
      .mockRejectedValueOnce(new Error('2'))
      .mockRejectedValueOnce(new Error('3'));
    const result = retry(fn);
    const settled = jest.fn();
    result.catch(settled);

    // Waits 1 s, then 2 s (plus up to 0.1 s jitter each), then gives up.
    await jest.advanceTimersByTimeAsync(3200);
    expect(fn).toHaveBeenCalledTimes(3);
    expect(settled).toHaveBeenCalledWith(new Error('3'));
  });

  it('stops early for an error not worth retrying', async () => {
    const fn = jest
      .fn<Promise<string>, []>()
      .mockRejectedValue(new Error('offline'));
    await expect(retry(fn, { shouldRetry: () => false })).rejects.toThrow(
      'offline',
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
