import { renderHook } from '@testing-library/react-native';
import useFirstListDrawn from 'hooks/useFirstListDrawn';
import { markPerf } from 'services/perf';

jest.mock('services/perf', () => ({ markPerf: jest.fn() }));

beforeEach(() => {
  jest.useFakeTimers();
});

it('marks the first list drawn after the frame that shows it', async () => {
  const { rerender } = await renderHook(
    ({ drawn }: { drawn: boolean }) => useFirstListDrawn(drawn),
    { initialProps: { drawn: false } },
  );
  jest.runOnlyPendingTimers();
  expect(markPerf).not.toHaveBeenCalled();

  await rerender({ drawn: true });
  expect(markPerf).not.toHaveBeenCalled();
  jest.runOnlyPendingTimers();
  expect(markPerf).toHaveBeenCalledWith('firstListDrawn');
});

it('marks nothing when the screen goes before its frame', async () => {
  const { unmount } = await renderHook(() => useFirstListDrawn(true));
  await unmount();
  jest.runOnlyPendingTimers();
  expect(markPerf).not.toHaveBeenCalled();
});
