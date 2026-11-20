import { act, renderHook } from '@testing-library/react-native';
import {
  NavigationContext,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import { Windows } from 'modules/windows';
import { kvStorage } from 'data/storage';
import {
  RELOAD_LINKS_KEY,
  forgetWindowLinksForReload,
  keepWindowLinksForReload,
} from 'services/windows';
import {
  DetailPane,
  useIsPrimaryWindow,
  useWindow,
  useWindowRestoration,
  useWindowTitle,
  WindowProvider,
} from 'hooks/useWindow';

let mockFocused = true;
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useIsFocused: () => mockFocused,
}));

// A screen's navigation, which says whether it's focused and when it gets
// focus again.
const focusListeners = new Set<() => void>();
const screenNavigation = {
  isFocused: () => mockFocused,
  addListener: (_event: 'focus', listener: () => void) => {
    focusListeners.add(listener);
    return () => focusListeners.delete(listener);
  },
} as unknown as NavigationProp<ParamListBase>;
const focus = () => {
  mockFocused = true;
  focusListeners.forEach(listener => listener());
};

const inWindow =
  (windowId?: string, initialURL?: string) =>
  ({ children }: React.PropsWithChildren) => (
    <WindowProvider windowId={windowId} initialURL={initialURL}>
      {children}
    </WindowProvider>
  );

const onScreen =
  (windowId?: string) =>
  ({ children }: React.PropsWithChildren) => (
    <WindowProvider windowId={windowId}>
      <NavigationContext.Provider value={screenNavigation}>
        {children}
      </NavigationContext.Provider>
    </WindowProvider>
  );

beforeEach(() => {
  mockFocused = true;
  focusListeners.clear();
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

  it('remembers one window only for a reload of the JS', async () => {
    await renderHook(() => useWindowRestoration({ type: 'today' }));
    expect(Windows!.setWindowLink).not.toHaveBeenCalled();
    keepWindowLinksForReload();
    expect(JSON.parse(kvStorage.getItem(RELOAD_LINKS_KEY) as string)).toEqual(
      expect.objectContaining({ '': 'learnx://today' }),
    );
    forgetWindowLinksForReload();
  });

  it('names a window after what its focused screen shows', async () => {
    const view = await renderHook(
      ({ title }: { title?: string }) => useWindowTitle(title),
      { wrapper: onScreen('a'), initialProps: { title: 'Notices' } },
    );
    expect(Windows!.setWindowTitle).toHaveBeenLastCalledWith('a', 'Notices');
    await view.rerender({ title: 'Homework 1' });
    expect(Windows!.setWindowTitle).toHaveBeenLastCalledWith('a', 'Homework 1');

    jest.mocked(Windows!.setWindowTitle).mockClear();
    // An item not loaded yet keeps the name the window has.
    await view.rerender({ title: undefined });
    mockFocused = false;
    await view.rerender({ title: 'Homework 2' });
    expect(Windows!.setWindowTitle).not.toHaveBeenCalled();

    // Back on the screen, as when what was pushed on it closes.
    focus();
    expect(Windows!.setWindowTitle).toHaveBeenLastCalledWith('a', 'Homework 2');
  });

  it('leaves naming the window to the list beside a detail pane', async () => {
    const Screen = onScreen('a');
    await renderHook(() => useWindowTitle('Homework 1'), {
      wrapper: ({ children }) => (
        <Screen>
          <DetailPane>{children}</DetailPane>
        </Screen>
      ),
    });
    expect(Windows!.setWindowTitle).not.toHaveBeenCalled();
  });

  it('names nothing with one window, or outside a navigator', async () => {
    await renderHook(() => useWindowTitle('Today'), { wrapper: onScreen() });
    await renderHook(() => useWindowTitle('Today'), { wrapper: inWindow('a') });
    expect(Windows!.setWindowTitle).not.toHaveBeenCalled();
  });
});
