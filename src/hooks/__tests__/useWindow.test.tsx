import { act, renderHook } from '@testing-library/react-native';
import { Windows } from 'modules/windows';
import {
  useIsPrimaryWindow,
  useWindow,
  useWindowRestoration,
  WindowProvider,
} from 'hooks/useWindow';

let mockFocused = true;
jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => mockFocused,
}));

const inWindow =
  (windowId?: string, initialURL?: string) =>
  ({ children }: React.PropsWithChildren) => (
    <WindowProvider windowId={windowId} initialURL={initialURL}>
      {children}
    </WindowProvider>
  );

beforeEach(() => {
  mockFocused = true;
});

describe('useWindow', () => {
  it('gives the root its window and the link it opened with', async () => {
    const { result } = await renderHook(useWindow, {
      wrapper: inWindow('a', 'learnx://notice/n1'),
    });
    expect(result.current).toEqual({
      windowId: 'a',
      initialURL: 'learnx://notice/n1',
    });
  });

  it('makes the only window the primary one', async () => {
    const { result } = await renderHook(useIsPrimaryWindow);
    expect(result.current).toBe(true);
  });

  it('hands the app-wide work to the next window when the oldest closes', async () => {
    const first = await renderHook(useIsPrimaryWindow, {
      wrapper: inWindow('a'),
    });
    const second = await renderHook(useIsPrimaryWindow, {
      wrapper: inWindow('b'),
    });
    expect(first.result.current).toBe(true);
    expect(second.result.current).toBe(false);

    await act(() => first.unmount());
    expect(second.result.current).toBe(true);
  });

  it('remembers what a window shows while its screen is focused', async () => {
    const view = await renderHook(
      ({ id }: { id?: string }) => useWindowRestoration({ type: 'notice', id }),
      { wrapper: inWindow('a'), initialProps: { id: undefined } },
    );
    expect(Windows!.setWindowLink).toHaveBeenLastCalledWith(
      'a',
      'learnx://notice',
    );
    await view.rerender({ id: 'n1' });
    expect(Windows!.setWindowLink).toHaveBeenLastCalledWith(
      'a',
      'learnx://notice/n1',
    );

    jest.mocked(Windows!.setWindowLink).mockClear();
    mockFocused = false;
    await view.rerender({ id: 'n2' });
    expect(Windows!.setWindowLink).not.toHaveBeenCalled();
  });

  it('remembers nothing with one window', async () => {
    await renderHook(() => useWindowRestoration({ type: 'today' }));
    expect(Windows!.setWindowLink).not.toHaveBeenCalled();
  });
});
