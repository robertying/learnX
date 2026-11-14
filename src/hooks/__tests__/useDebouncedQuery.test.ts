import { act, renderHook } from '@testing-library/react-native';
import useDebouncedQuery from 'hooks/useDebouncedQuery';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useDebouncedQuery', () => {
  it('follows a query once it has stayed the same for the delay', async () => {
    const { result, rerender } = await renderHook(
      ({ query }: { query: string }) => useDebouncedQuery(query, 250),
      { initialProps: { query: '' } },
    );
    await rerender({ query: 'a' });
    await act(() => jest.advanceTimersByTime(200));
    await rerender({ query: 'ab' });
    await act(() => jest.advanceTimersByTime(200));
    expect(result.current).toBe('');
    await act(() => jest.advanceTimersByTime(50));
    expect(result.current).toBe('ab');
  });

  it('follows a cleared query at once', async () => {
    const { result, rerender } = await renderHook(
      ({ query }: { query: string }) => useDebouncedQuery(query, 250),
      { initialProps: { query: 'ab' } },
    );
    expect(result.current).toBe('ab');
    await rerender({ query: ' ' });
    expect(result.current).toBe(' ');
  });
});
