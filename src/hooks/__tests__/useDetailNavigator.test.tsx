import { useState } from 'react';
import { act, renderHook } from '@testing-library/react-native';
import {
  CommonActions,
  NavigationContainerRef,
  NavigationContext,
  NavigationRouteContext,
  StackActions,
} from '@react-navigation/native';
import { DetailStackParams } from 'navigation/types';
import { SplitViewContext } from 'navigation/SplitView';
import SplitSizes from 'constants/SplitSizes';
import useDetailNavigator, {
  reportDetailReady,
  reportDetailState,
  sameDetailRoot,
  useDetailRoot,
  useShowDetail,
} from 'hooks/useDetailNavigator';

// The split view's divider pulls in the theme, which isn't needed here.
jest.mock('components/Divider', () => () => null);

const detailRouteNames = ['EmptyDetail', 'NoticeDetail', 'FileDetail'];
const container = {
  ready: false,
  isReady: () => false,
  dispatch: jest.fn(),
  getRootState: () => ({ key: 'detail', routeNames: detailRouteNames }),
};
container.isReady = () => container.ready;
const containerRef = {
  current: container as unknown as NavigationContainerRef<DetailStackParams>,
};

const wrapper = ({ children }: React.PropsWithChildren) => (
  <SplitViewContext.Provider
    value={{
      detailNavigationContainerRef: containerRef,
      showDetail: true,
      laidOut: true,
      showMaster: true,
      toggleMaster: () => {},
      masterWidth: SplitSizes.masterWidth,
    }}
  >
    {children}
  </SplitViewContext.Provider>
);

beforeEach(() => {
  container.ready = false;
});

it('waits for the detail stack to report that it is ready', async () => {
  const hook = await renderHook(() => useDetailNavigator(), { wrapper });
  expect(hook.result.current).toBeUndefined();

  container.ready = true;
  await act(() => reportDetailReady());
  expect(hook.result.current).toBeDefined();
});

it('shows an item in the pane in place of what it showed', async () => {
  container.ready = true;
  const navigation = { dispatch: jest.fn() };
  const hook = await renderHook(() => useShowDetail(navigation), { wrapper });

  hook.result.current('NoticeDetail', { id: 'n1' });
  expect(container.dispatch).toHaveBeenCalledWith(
    CommonActions.reset({
      index: 0,
      routes: [
        { name: 'NoticeDetail', params: { id: 'n1', disableAnimation: true } },
      ],
    }),
  );
  expect(navigation.dispatch).not.toHaveBeenCalled();
});

it('pushes on the list without a detail pane', async () => {
  const navigation = { dispatch: jest.fn() };
  const hook = await renderHook(() => useShowDetail(navigation));

  hook.result.current('CourseDetail', { id: 'c1' });
  expect(navigation.dispatch).toHaveBeenCalledWith(
    StackActions.push('CourseDetail', { id: 'c1' }),
  );
});

describe('what the pane shows', () => {
  const state = (...routes: { name: string; params?: object }[]) =>
    ({
      routes: routes.map((route, i) => ({ key: `r${i}`, ...route })),
    }) as never;

  it("follows the pane's first page, not what is pushed on it", async () => {
    const hook = await renderHook(() => useDetailRoot(), { wrapper });
    expect(hook.result.current).toBeUndefined();

    await act(() =>
      reportDetailState(
        containerRef,
        state({ name: 'NoticeDetail', params: { id: 'n1' } }),
      ),
    );
    expect(hook.result.current).toEqual({ name: 'NoticeDetail', id: 'n1' });

    await act(() =>
      reportDetailState(
        containerRef,
        state(
          { name: 'NoticeDetail', params: { id: 'n1' } },
          { name: 'FileDetail', params: { attachment: {} } },
        ),
      ),
    );
    expect(hook.result.current).toEqual({ name: 'NoticeDetail', id: 'n1' });

    await act(() =>
      reportDetailState(containerRef, state({ name: 'EmptyDetail' })),
    );
    expect(hook.result.current).toEqual({ name: 'EmptyDetail' });
  });

  it('is nothing without a pane', async () => {
    const hook = await renderHook(() => useDetailRoot());
    expect(hook.result.current).toBeUndefined();
  });

  it('is the same root for the same screen and item', () => {
    const notice = { name: 'NoticeDetail', id: 'n1' } as const;
    expect(sameDetailRoot(notice, { ...notice })).toBe(true);
    expect(sameDetailRoot(notice, { ...notice, id: 'n2' })).toBe(false);
    expect(sameDetailRoot({ name: 'About' }, { name: 'About' })).toBe(true);
    expect(sameDetailRoot(undefined, { name: 'About' })).toBe(false);
    expect(sameDetailRoot(undefined, undefined)).toBe(true);
  });
});

describe('pages pushed on the list before there was a pane', () => {
  const listNavigation = (...names: string[]) => ({
    dispatch: jest.fn(),
    getState: () => ({
      key: 'list-stack',
      routes: names.map((name, i) => ({
        key: `${name}-${i}`,
        name,
        params: { id: `${i}` },
      })),
    }),
  });

  const renderList = (navigation: ReturnType<typeof listNavigation>) => {
    const Wrapper = ({ children }: React.PropsWithChildren) => (
      <NavigationContext.Provider value={navigation as never}>
        <NavigationRouteContext.Provider
          value={navigation.getState().routes[0] as never}
        >
          {wrapper({ children })}
        </NavigationRouteContext.Provider>
      </NavigationContext.Provider>
    );
    return renderHook(() => useShowDetail(navigation), { wrapper: Wrapper });
  };

  it('move into the pane once there is one', async () => {
    const navigation = listNavigation('Notices', 'NoticeDetail', 'FileDetail');
    await renderList(navigation);
    expect(container.dispatch).not.toHaveBeenCalled();

    container.ready = true;
    await act(() => reportDetailReady());
    expect(container.dispatch).toHaveBeenCalledWith(
      CommonActions.reset({
        index: 1,
        routes: [
          {
            name: 'NoticeDetail',
            params: { id: '1', disableAnimation: true },
          },
          { name: 'FileDetail', params: { id: '2' } },
        ],
      }),
    );
    expect(navigation.dispatch).toHaveBeenCalledWith(StackActions.pop(2));
  });

  it("stay when one isn't a page of the pane", async () => {
    container.ready = true;
    const navigation = listNavigation('Today', 'Settings', 'NoticeDetail');
    await renderList(navigation);
    expect(container.dispatch).not.toHaveBeenCalled();
    expect(navigation.dispatch).not.toHaveBeenCalled();
  });

  it('stay for a screen in the pane itself', async () => {
    container.ready = true;
    const navigation = listNavigation('NoticeDetail', 'FileDetail');
    navigation.getState = () => ({
      ...listNavigation('NoticeDetail', 'FileDetail').getState(),
      key: 'detail',
    });
    await renderList(navigation);
    expect(container.dispatch).not.toHaveBeenCalled();
  });
});

describe('what the pane showed when it goes away', () => {
  const listNavigation = (...names: string[]) => ({
    dispatch: jest.fn(),
    getState: () => ({
      key: 'list-stack',
      routeNames: ['Notices', 'NoticeDetail', 'FileDetail', 'Settings'],
      routes: names.map((name, i) => ({ key: `${name}-${i}`, name })),
    }),
  });
  const paneState = (...names: string[]) => ({
    key: 'detail',
    routeNames: detailRouteNames,
    routes: names.map((name, i) => ({ name, params: { id: `p${i}` } })),
  });

  /** A list in a split whose pane can collapse (`setShown(false)`). */
  const renderList = async (
    navigation: ReturnType<typeof listNavigation>,
    routeIndex = 0,
  ) => {
    let setShown: (shown: boolean) => void = () => {};
    const Wrapper = ({ children }: React.PropsWithChildren) => {
      const [shown, set] = useState(true);
      setShown = set;
      return (
        <NavigationContext.Provider value={navigation as never}>
          <NavigationRouteContext.Provider
            value={navigation.getState().routes[routeIndex] as never}
          >
            <SplitViewContext.Provider
              value={{
                detailNavigationContainerRef: shown ? containerRef : null,
                showDetail: shown,
                laidOut: true,
                showMaster: true,
                toggleMaster: () => {},
                masterWidth: SplitSizes.masterWidth,
              }}
            >
              {children}
            </SplitViewContext.Provider>
          </NavigationRouteContext.Provider>
        </NavigationContext.Provider>
      );
    };
    await renderHook(() => useShowDetail(navigation), { wrapper: Wrapper });
    return (value: boolean) => act(() => setShown(value));
  };

  const getRootState = container.getRootState;
  /** A pane that shows `names`, and is emptied by a reset unless `held`. */
  const showInPane = (names: string[], held = false) => {
    let state = paneState(...names);
    container.getRootState = (() => state) as never;
    container.dispatch.mockImplementation(() => {
      if (!held) {
        state = paneState('EmptyDetail');
      }
    });
  };
  afterEach(() => {
    container.getRootState = getRootState;
    container.dispatch.mockReset();
  });

  it('moves onto the list, as UIKit does when a split collapses', async () => {
    container.ready = true;
    showInPane(['NoticeDetail', 'FileDetail']);
    const navigation = listNavigation('Notices');
    const setShown = await renderList(navigation);
    container.dispatch.mockClear();

    await setShown(false);
    expect(navigation.dispatch.mock.calls).toEqual([
      [StackActions.push('NoticeDetail', { id: 'p0' })],
      [StackActions.push('FileDetail', { id: 'p1' })],
    ]);
    expect(container.dispatch).toHaveBeenCalledWith(
      CommonActions.reset({ index: 0, routes: [{ name: 'EmptyDetail' }] }),
    );
  });

  it('opens a page no list has in its sheet, with what was pushed on it', async () => {
    container.ready = true;
    showInPane(['NoticeDetail', 'AssignmentSubmission', 'FileDetail']);
    const navigation = listNavigation('Notices');
    const setShown = await renderList(navigation);
    container.dispatch.mockClear();

    await setShown(false);
    expect(navigation.dispatch.mock.calls).toEqual([
      [StackActions.push('NoticeDetail', { id: 'p0' })],
      [
        CommonActions.navigate('AssignmentSubmissionStack', {
          state: {
            routes: [
              { name: 'AssignmentSubmission', params: { id: 'p1' } },
              { name: 'FileDetail', params: { id: 'p2' } },
            ],
          },
        }),
      ],
    ]);
    expect(container.dispatch).toHaveBeenCalledWith(
      CommonActions.reset({ index: 0, routes: [{ name: 'EmptyDetail' }] }),
    );
  });

  it('opens CourseX in its sheet', async () => {
    container.ready = true;
    showInPane(['CourseX']);
    const navigation = listNavigation('Notices');
    const setShown = await renderList(navigation);

    await setShown(false);
    expect(navigation.dispatch.mock.calls).toEqual([
      [
        CommonActions.navigate('CourseXStack', {
          state: { routes: [{ name: 'CourseX', params: { id: 'p0' } }] },
        }),
      ],
    ]);
  });

  it('leaves a pane whose page holds itself (a submission uploading)', async () => {
    container.ready = true;
    showInPane(['NoticeDetail', 'AssignmentSubmission'], true);
    const navigation = listNavigation('Notices');
    const setShown = await renderList(navigation);

    await setShown(false);
    expect(navigation.dispatch).not.toHaveBeenCalled();
  });

  it('leaves a page with neither a list nor a sheet in the pane', async () => {
    container.ready = true;
    showInPane(['NoticeDetail', 'Unknown']);
    const navigation = listNavigation('Notices');
    const setShown = await renderList(navigation);
    container.dispatch.mockClear();

    await setShown(false);
    expect(navigation.dispatch).not.toHaveBeenCalled();
    expect(container.dispatch).not.toHaveBeenCalled();
  });

  it('leaves an empty pane alone', async () => {
    container.ready = true;
    showInPane(['EmptyDetail']);
    const navigation = listNavigation('Notices');
    const setShown = await renderList(navigation);
    container.dispatch.mockClear();

    await setShown(false);
    expect(navigation.dispatch).not.toHaveBeenCalled();
    expect(container.dispatch).not.toHaveBeenCalled();
  });

  it('is left to the list on top (Settings on Today)', async () => {
    container.ready = true;
    showInPane(['NoticeDetail']);
    const navigation = listNavigation('Notices', 'Settings');
    const setShown = await renderList(navigation, 0);
    await setShown(false);
    expect(navigation.dispatch).not.toHaveBeenCalled();
  });

  it('does nothing for a list that never had a pane', async () => {
    const navigation = listNavigation('Notices');
    const setShown = await renderList(navigation);
    await setShown(false);
    expect(navigation.dispatch).not.toHaveBeenCalled();
  });
});
