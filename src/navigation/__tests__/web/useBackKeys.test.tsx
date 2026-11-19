import { renderHook } from '@testing-library/react';
import type { NavigationState } from '@react-navigation/native';
import useBackKeys from 'navigation/useBackKeys';

type Route = { key: string; name: string; state?: State };
type State = Partial<NavigationState> & { routes: Route[] };

const stack = (key: string, routes: Route[], index = routes.length - 1) =>
  ({ key, type: 'stack', index, routes }) as State;
const tabs = (key: string, routes: Route[], index: number) =>
  ({ key, type: 'tab', index, routes }) as State;
const route = (name: string, state?: State): Route => ({
  key: `${name}-key`,
  name,
  state,
});

const container = (state: State, options: object = {}) => ({
  current: {
    isReady: () => true,
    getRootState: () => state as NavigationState,
    getCurrentOptions: () => options,
    dispatch: jest.fn(),
  },
});

const press = (init: KeyboardEventInit) =>
  window.dispatchEvent(new KeyboardEvent('keydown', init));
const back = () => press({ key: 'ArrowLeft', altKey: true });
const close = () => press({ key: 'Escape' });

const pop = (target: string) => ({
  type: 'POP',
  payload: { count: 1 },
  target,
});

// The main UI: a list's stack in a tab, under the window's sheets.
const main = (list: Route[], sheet?: Route) =>
  stack('root', [
    route(
      'Main',
      tabs('tabs', [route('A', stack('list', list)), route('B')], 0),
    ),
    ...(sheet ? [sheet] : []),
  ]);

it('goes back in the detail pane, then in the list', () => {
  const window = container(main([route('Courses'), route('CourseDetail')]));
  const detail = container(
    stack('detail', [route('EmptyDetail'), route('NoticeDetail')]),
  );
  const { unmount } = renderHook(() => useBackKeys(window, detail));
  back();
  expect(detail.current.dispatch).toHaveBeenCalledWith(pop('detail'));
  expect(window.current.dispatch).not.toHaveBeenCalled();

  detail.current.getRootState = () =>
    stack('detail', [route('EmptyDetail')]) as NavigationState;
  back();
  expect(window.current.dispatch).toHaveBeenCalledWith(pop('list'));
  unmount();
});

it("doesn't switch tabs", () => {
  const window = container(main([route('Courses')]));
  const { unmount } = renderHook(() => useBackKeys(window, null));
  back();
  // Esc has no sheet to close either.
  close();
  expect(window.current.dispatch).not.toHaveBeenCalled();
  unmount();
});

it('goes back in a sheet before the pane, and closes it from its first page', () => {
  const window = container(
    main(
      [route('Courses')],
      route('SearchStack', stack('search', [route('Search')])),
    ),
  );
  const detail = container(
    stack('detail', [route('EmptyDetail'), route('NoticeDetail')]),
  );
  const { unmount } = renderHook(() => useBackKeys(window, detail));
  back();
  expect(window.current.dispatch).toHaveBeenCalledWith(pop('root'));
  expect(detail.current.dispatch).not.toHaveBeenCalled();
  unmount();
});

it('closes a sheet with Esc from any of its pages', () => {
  const window = container(
    main(
      [route('Courses')],
      route(
        'SearchStack',
        stack('search', [route('Search'), route('NoticeDetail')]),
      ),
    ),
  );
  const { unmount } = renderHook(() => useBackKeys(window, null));
  back();
  expect(window.current.dispatch).toHaveBeenLastCalledWith(pop('search'));
  close();
  expect(window.current.dispatch).toHaveBeenLastCalledWith(pop('root'));
  unmount();
});

it("leaves a page a swipe couldn't, as a submission while it uploads", () => {
  const window = container(
    main(
      [route('Courses')],
      route(
        'AssignmentSubmissionStack',
        stack('submission', [route('AssignmentSubmission')]),
      ),
    ),
    { gestureEnabled: false },
  );
  const { unmount } = renderHook(() => useBackKeys(window, null));
  back();
  close();
  expect(window.current.dispatch).not.toHaveBeenCalled();
  unmount();
});

it('waits for the containers, and listens only while enabled', () => {
  const window = container(stack('login', [route('Login'), route('SSO')]));
  const notReady = { current: { ...window.current, isReady: () => false } };
  const { unmount, rerender } = renderHook(
    ({ root, enabled }) => useBackKeys(root, null, enabled),
    { initialProps: { root: notReady, enabled: true } },
  );
  back();
  close();
  expect(window.current.dispatch).not.toHaveBeenCalled();

  rerender({ root: window, enabled: false });
  back();
  expect(window.current.dispatch).not.toHaveBeenCalled();

  rerender({ root: window, enabled: true });
  back();
  expect(window.current.dispatch).toHaveBeenCalledWith(pop('login'));
  unmount();
});
