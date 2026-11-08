import { act, renderHook } from '@testing-library/react-native';
import { NavigationContainerRef } from '@react-navigation/native';
import { SplitViewContext } from 'components/SplitView';
import Numbers from 'constants/Numbers';
import useNotificationTarget, {
  setPendingNotificationTarget,
} from 'hooks/useNotificationTarget';

// The split view's divider pulls in the theme, which isn't needed here.
jest.mock('components/Divider', () => () => null);
jest.mock('@react-navigation/native', () => ({}));

const splitContext = (navigator: object | null) => ({
  detailNavigationContainerRef: navigator
    ? { current: navigator as NavigationContainerRef<{}> }
    : null,
  splitEnabled: true,
  showDetail: true,
  showMaster: true,
  toggleMaster: () => {},
  masterWidth: Numbers.splitViewMasterWidth,
});

afterEach(() => setPendingNotificationTarget(null));

it('opens a pending item of its type once', async () => {
  const open = jest.fn();
  setPendingNotificationTarget({ type: 'notice', id: 'n1' });
  const hook = await renderHook(() => useNotificationTarget('notice', open));
  expect(open.mock.calls).toEqual([['n1']]);
  await hook.rerender({});
  expect(open).toHaveBeenCalledTimes(1);
});

it('leaves items of other types to their lists', async () => {
  const open = jest.fn();
  setPendingNotificationTarget({ type: 'file', id: 'f1' });
  await renderHook(() => useNotificationTarget('notice', open));
  expect(open).not.toHaveBeenCalled();
});

it('opens a tap that arrives while the list is shown', async () => {
  const open = jest.fn();
  await renderHook(() => useNotificationTarget('assignment', open));
  await act(() =>
    setPendingNotificationTarget({ type: 'assignment', id: 'a1' }),
  );
  expect(open.mock.calls).toEqual([['a1']]);
});

it('waits for the detail pane of a split view', async () => {
  const open = jest.fn();
  let context = splitContext(null);
  const wrapper = ({ children }: React.PropsWithChildren) => (
    <SplitViewContext.Provider value={context}>
      {children}
    </SplitViewContext.Provider>
  );
  setPendingNotificationTarget({ type: 'notice', id: 'n1' });
  const hook = await renderHook(() => useNotificationTarget('notice', open), {
    wrapper,
  });
  expect(open).not.toHaveBeenCalled();

  context = splitContext({});
  await hook.rerender({});
  expect(open.mock.calls).toEqual([['n1']]);
});
