import { renderHook } from '@testing-library/react-native';
import useInitialRefreshHidden from 'hooks/useInitialRefreshHidden';

it('hides the spinner for the first fetch only', async () => {
  const hook = await renderHook(
    ({ refreshing }: { refreshing: boolean }) =>
      useInitialRefreshHidden(refreshing),
    { initialProps: { refreshing: false } },
  );
  expect(hook.result.current).toBe(false);
  await hook.rerender({ refreshing: true });
  expect(hook.result.current).toBe(false);
  await hook.rerender({ refreshing: false });
  expect(hook.result.current).toBe(false);
  await hook.rerender({ refreshing: true });
  expect(hook.result.current).toBe(true);
  await hook.rerender({ refreshing: false });
  expect(hook.result.current).toBe(false);
});
