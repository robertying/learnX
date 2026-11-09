import { act, renderHook } from '@testing-library/react-native';
import {
  CommonActions,
  NavigationContainerRef,
  StackActions,
} from '@react-navigation/native';
import { DetailStackParams } from 'screens/types';
import { SplitViewContext } from 'navigation/SplitView';
import Numbers from 'constants/Numbers';
import useDetailNavigator, {
  reportDetailReady,
  useShowDetail,
} from 'hooks/useDetailNavigator';

// The split view's divider pulls in the theme, which isn't needed here.
jest.mock('components/Divider', () => () => null);

const container = { ready: false, isReady: () => false, dispatch: jest.fn() };
container.isReady = () => container.ready;

const wrapper = ({ children }: React.PropsWithChildren) => (
  <SplitViewContext.Provider
    value={{
      detailNavigationContainerRef: {
        current:
          container as unknown as NavigationContainerRef<DetailStackParams>,
      },
      splitEnabled: true,
      showDetail: true,
      showMaster: true,
      toggleMaster: () => {},
      masterWidth: Numbers.splitViewMasterWidth,
    }}
  >
    {children}
  </SplitViewContext.Provider>
);

beforeEach(() => {
  container.ready = false;
  container.dispatch.mockClear();
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
