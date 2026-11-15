import { waitAtMost } from 'helpers/waitAtMost';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('waitAtMost', () => {
  it('resolves to the value when it comes in time', async () => {
    const result = waitAtMost(Promise.resolve('ok'), 1000);
    await expect(result).resolves.toBe('ok');
    expect(jest.getTimerCount()).toBe(0);
  });

  it('resolves to undefined once the time is up', async () => {
    const settled = jest.fn();
    void waitAtMost(new Promise(() => {}), 1000).then(settled);
    await jest.advanceTimersByTimeAsync(999);
    expect(settled).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    expect(settled).toHaveBeenCalledWith(undefined);
  });

  it('rejects when the promise rejects first', async () => {
    const result = waitAtMost(Promise.reject(new Error('no')), 1000);
    await expect(result).rejects.toThrow('no');
    expect(jest.getTimerCount()).toBe(0);
  });

  it("doesn't wait when no time is left", async () => {
    const settled = jest.fn();
    void waitAtMost(new Promise(() => {}), -5).then(settled);
    await jest.advanceTimersByTimeAsync(0);
    expect(settled).toHaveBeenCalledWith(undefined);
  });
});
