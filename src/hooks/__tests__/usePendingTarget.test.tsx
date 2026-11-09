import { act, renderHook } from '@testing-library/react-native';
import { NavigationContainerRef } from '@react-navigation/native';
import { DetailStackParams } from 'screens/types';
import { SplitViewContext } from 'components/SplitView';
import Numbers from 'constants/Numbers';
import usePendingTarget, { setPendingTarget } from 'hooks/usePendingTarget';

// The split view's divider pulls in the theme, which isn't needed here.
jest.mock('components/Divider', () => () => null);
jest.mock('@react-navigation/native', () => ({}));
jest.mock('navigation/layout', () => ({ nativeSplit: true }));
let mockSplitLaidOut = true;
let mockTablet = true;
jest.mock('constants/DeviceInfo', () => ({
  isTablet: () => mockTablet,
  isMac: () => false,
}));
jest.mock('components/NativeSplitView', () => ({
  useSplitLaidOut: () => mockSplitLaidOut,
}));

const splitContext = (navigator: object | null) => ({
  detailNavigationContainerRef: navigator
    ? { current: navigator as NavigationContainerRef<DetailStackParams> }
    : null,
  splitEnabled: true,
  showDetail: true,
  showMaster: true,
  toggleMaster: () => {},
  masterWidth: Numbers.splitViewMasterWidth,
});

afterEach(() => {
  setPendingTarget(null);
  mockSplitLaidOut = true;
  mockTablet = true;
});

it('opens a pending item of its type once', async () => {
  const open = jest.fn();
  setPendingTarget({ type: 'notice', id: 'n1' });
  const hook = await renderHook(() => usePendingTarget('notice', open));
  expect(open.mock.calls).toEqual([['n1', false]]);
  await hook.rerender({});
  expect(open).toHaveBeenCalledTimes(1);
});

it('leaves items of other types to their lists', async () => {
  const open = jest.fn();
  setPendingTarget({ type: 'file', id: 'f1' });
  await renderHook(() => usePendingTarget('notice', open));
  expect(open).not.toHaveBeenCalled();
});

it('opens a tap that arrives while the list is shown', async () => {
  const open = jest.fn();
  await renderHook(() => usePendingTarget('assignment', open));
  await act(() => setPendingTarget({ type: 'assignment', id: 'a1' }));
  expect(open.mock.calls).toEqual([['a1', false]]);
});

it('waits for the detail pane of a split view', async () => {
  const open = jest.fn();
  let context = splitContext(null);
  const wrapper = ({ children }: React.PropsWithChildren) => (
    <SplitViewContext.Provider value={context}>
      {children}
    </SplitViewContext.Provider>
  );
  setPendingTarget({ type: 'notice', id: 'n1' });
  const hook = await renderHook(() => usePendingTarget('notice', open), {
    wrapper,
  });
  expect(open).not.toHaveBeenCalled();

  context = splitContext({ isReady: () => true });
  await hook.rerender({});
  expect(open.mock.calls).toEqual([['n1', true]]);
});

it('waits for the split to be laid out on iPad', async () => {
  const open = jest.fn();
  mockSplitLaidOut = false;
  const context = splitContext({ isReady: () => true });
  const wrapper = ({ children }: React.PropsWithChildren) => (
    <SplitViewContext.Provider value={context}>
      {children}
    </SplitViewContext.Provider>
  );
  setPendingTarget({ type: 'notice', id: 'n1' });
  const hook = await renderHook(() => usePendingTarget('notice', open), {
    wrapper,
  });
  expect(open).not.toHaveBeenCalled();

  mockSplitLaidOut = true;
  await hook.rerender({});
  expect(open.mock.calls).toEqual([['n1', true]]);
});

it("pushes on an iPhone, even while a tab's split hands out its hidden pane", async () => {
  const open = jest.fn();
  mockTablet = false;
  mockSplitLaidOut = false;
  const context = splitContext({ isReady: () => true });
  const wrapper = ({ children }: React.PropsWithChildren) => (
    <SplitViewContext.Provider value={context}>
      {children}
    </SplitViewContext.Provider>
  );
  setPendingTarget({ type: 'file', id: 'f1' });
  await renderHook(() => usePendingTarget('file', open), { wrapper });
  expect(open.mock.calls).toEqual([['f1', false]]);
});
