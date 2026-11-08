import { act, renderHook } from '@testing-library/react-native';
import useMinute from 'hooks/useMinute';

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

  it('shares one timer and stops it once nothing uses it', async () => {
    const setSpy = jest.spyOn(globalThis, 'setInterval');
    const clearSpy = jest.spyOn(globalThis, 'clearInterval');
    const minuteTimers = () =>
      setSpy.mock.calls.filter(call => call[1] === 10_000).length;

    const first = await renderHook(() => useMinute());
    const second = await renderHook(() => useMinute());
    expect(minuteTimers()).toBe(1);
    await first.unmount();
    expect(clearSpy).not.toHaveBeenCalled();
    await second.unmount();
    expect(clearSpy).toHaveBeenCalledTimes(1);
  });
});
