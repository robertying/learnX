import { act, renderHook } from '@testing-library/react-native';
import { NavigationContainerRef } from '@react-navigation/native';
import { DetailStackParams } from 'navigation/types';
import { SplitViewContext } from 'navigation/SplitView';
import SplitSizes from 'constants/SplitSizes';
import usePendingTarget, { setPendingTarget } from 'hooks/usePendingTarget';

// The split view's divider pulls in the theme, which isn't needed here.
jest.mock('components/Divider', () => () => null);
jest.mock('@react-navigation/native', () => ({}));

const splitContext = (
  navigator: object | null,
  { showDetail = true, laidOut = true } = {},
) => ({
  detailNavigationContainerRef: navigator
    ? { current: navigator as NavigationContainerRef<DetailStackParams> }
    : null,
  showDetail,
  laidOut,
  showMaster: true,
  toggleMaster: () => {},
  masterWidth: SplitSizes.masterWidth,
});

afterEach(() => {
  setPendingTarget(null);
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

it('waits for a native split to be laid out, which may still collapse', async () => {
  const open = jest.fn();
  // Before UIKit has put it on screen, a split hands out its detail pane.
  let context = splitContext({ isReady: () => true }, { laidOut: false });
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

  // Collapsed, as on an iPhone: pushed on the list.
  context = splitContext(null, { showDetail: false });
  await hook.rerender({});
  expect(open.mock.calls).toEqual([['n1', false]]);
});

it('opens in the detail pane of an expanded split, whatever the device', async () => {
  const open = jest.fn();
  const context = splitContext({ isReady: () => true });
  const wrapper = ({ children }: React.PropsWithChildren) => (
    <SplitViewContext.Provider value={context}>
      {children}
    </SplitViewContext.Provider>
  );
  setPendingTarget({ type: 'file', id: 'f1' });
  await renderHook(() => usePendingTarget('file', open), { wrapper });
  expect(open.mock.calls).toEqual([['f1', true]]);
});
