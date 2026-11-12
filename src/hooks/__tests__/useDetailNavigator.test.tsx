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
