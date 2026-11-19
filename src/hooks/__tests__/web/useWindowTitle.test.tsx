import { renderHook } from '@testing-library/react-native';
import {
  NavigationContext,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import { DetailPane, useWindowTitle, WindowProvider } from 'hooks/useWindow';

// The Electron app's one window, which has no id: named through the page's
// title, which the main process shows as "<title> - learnX".
let focused = true;
const screenNavigation = {
  isFocused: () => focused,
  addListener: () => () => {},
} as unknown as NavigationProp<ParamListBase>;

const OnScreen = ({ children }: React.PropsWithChildren) => (
  <WindowProvider>
    <NavigationContext.Provider value={screenNavigation}>
      {children}
    </NavigationContext.Provider>
  </WindowProvider>
);

beforeEach(() => {
  focused = true;
  document.title = 'learnX';
});

it('names the window through the page title', async () => {
  const view = await renderHook(
    ({ title }: { title?: string }) => useWindowTitle(title),
    { wrapper: OnScreen, initialProps: { title: 'Notices' } },
  );
  expect(document.title).toBe('Notices');
  await view.rerender({ title: 'Homework 1' });
  expect(document.title).toBe('Homework 1');
  focused = false;
  await view.rerender({ title: 'Homework 2' });
  expect(document.title).toBe('Homework 1');
});

it('leaves naming the window to the list beside a detail pane', async () => {
  await renderHook(() => useWindowTitle('Homework 1'), {
    wrapper: ({ children }) => (
      <OnScreen>
        <DetailPane>{children}</DetailPane>
      </OnScreen>
    ),
  });
  expect(document.title).toBe('learnX');
});
