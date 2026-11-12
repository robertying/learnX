import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useBeijingDay, useDayPart, useMinute, useToday } from 'hooks/useClock';

beforeEach(() => {
  jest.useFakeTimers({ now: new Date('2026-03-15T12:00:30Z') });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useMinute', () => {
  it('is the current minute and moves on with the clock', async () => {
    const view = await renderHook(() => useMinute());
    expect(view.result.current).toBe(Date.parse('2026-03-15T12:00:00Z'));

    await act(() => jest.advanceTimersByTime(20_000));
    expect(view.result.current).toBe(Date.parse('2026-03-15T12:00:00Z'));

    await act(() => jest.advanceTimersByTime(20_000));
    expect(view.result.current).toBe(Date.parse('2026-03-15T12:01:00Z'));
  });

  it('wakes at the start of each minute, not before', async () => {
    const renders = jest.fn();
    const view = await renderHook(() => {
      renders();
      return useMinute();
    });
    // 12:00:30 → 12:01:00, plus a little
    await act(() => jest.advanceTimersByTime(29_000));
    expect(renders).toHaveBeenCalledTimes(1);
    await act(() => jest.advanceTimersByTime(1_100));
    expect(view.result.current).toBe(Date.parse('2026-03-15T12:01:00Z'));
    await act(() => jest.advanceTimersByTime(60_000));
    expect(view.result.current).toBe(Date.parse('2026-03-15T12:02:00Z'));
    expect(renders).toHaveBeenCalledTimes(3);
  });

  it('catches up as soon as the app comes back to the foreground', async () => {
    const listen = jest.spyOn(AppState, 'addEventListener');
    const view = await renderHook(() => useMinute());
    const onChange = listen.mock.calls[0][1] as (state: string) => void;

    // timers don't run in the background
    jest.setSystemTime(new Date('2026-03-15T12:40:10Z'));
    await act(() => onChange('background'));
    expect(view.result.current).toBe(Date.parse('2026-03-15T12:00:00Z'));
    await act(() => onChange('active'));
    expect(view.result.current).toBe(Date.parse('2026-03-15T12:40:00Z'));
  });

  it('shares one timer and stops it once nothing uses it', async () => {
    const removes: jest.Mock[] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation(() => {
      const remove = jest.fn();
      removes.push(remove);
      return { remove };
    });
    // the clock's timers are the ones up to a minute out
    const set = jest.spyOn(globalThis, 'setTimeout');
    const clear = jest.spyOn(globalThis, 'clearTimeout');
    const pending = () => {
      const cleared = new Set(clear.mock.calls.map(call => call[0]));
      return set.mock.results.filter(
        (result, i) =>
          (set.mock.calls[i][1] ?? 0) > 1_000 && !cleared.has(result.value),
      ).length;
    };
    const first = await renderHook(() => useMinute());
    const second = await renderHook(() => useMinute());
    expect(pending()).toBe(1);
    expect(removes).toHaveLength(1);

    await first.unmount();
    expect(pending()).toBe(1);
    expect(removes[0]).not.toHaveBeenCalled();

    // the foreground listener goes with the timer
    await second.unmount();
    expect(pending()).toBe(0);
    expect(removes[0]).toHaveBeenCalledTimes(1);
  });
});

describe('useToday', () => {
  it('is the start of the day on the device and changes at midnight', async () => {
    // 23:59:30 in Asia/Shanghai, where tests run.
    jest.setSystemTime(new Date('2026-03-15T15:59:30Z'));
    const renders = jest.fn();
    const view = await renderHook(() => {
      renders();
      return useToday();
    });
    expect(view.result.current).toBe(Date.parse('2026-03-15T00:00:00+08:00'));

    await act(() => jest.advanceTimersByTime(10_000));
    expect(renders).toHaveBeenCalledTimes(1);

    await act(() => jest.advanceTimersByTime(30_000));
    expect(view.result.current).toBe(Date.parse('2026-03-16T00:00:00+08:00'));
    expect(renders).toHaveBeenCalledTimes(2);
  });
});

describe('useBeijingDay', () => {
  it('is the day in Beijing and changes at its midnight', async () => {
    // 23:59:30 in Asia/Shanghai, where tests run.
    jest.setSystemTime(new Date('2026-03-15T15:59:30Z'));
    const renders = jest.fn();
    const view = await renderHook(() => {
      renders();
      return useBeijingDay();
    });
    expect(view.result.current).toBe('2026-03-15');

    await act(() => jest.advanceTimersByTime(10_000));
    expect(renders).toHaveBeenCalledTimes(1);

    await act(() => jest.advanceTimersByTime(30_000));
    expect(view.result.current).toBe('2026-03-16');
  });
});

describe('useDayPart', () => {
  it('moves on with the clock, re-rendering only when the part changes', async () => {
    // 16:58:30 in Beijing, where Jest runs
    jest.setSystemTime(new Date('2026-03-15T08:58:30Z'));
    const renders = jest.fn();
    const view = await renderHook(() => {
      renders();
      return useDayPart();
    });
    expect(view.result.current).toBe('afternoon');
    await act(() => jest.advanceTimersByTime(60_000));
    expect(view.result.current).toBe('afternoon');
    expect(renders).toHaveBeenCalledTimes(1);
    await act(() => jest.advanceTimersByTime(60_000));
    expect(view.result.current).toBe('evening');
    expect(renders).toHaveBeenCalledTimes(2);
  });
});
