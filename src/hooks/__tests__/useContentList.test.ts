import { act, renderHook } from '@testing-library/react-native';
import { initialAuth, useAuthStore } from 'data/auth';
import { mockNotices } from 'data/mock';
import { useCourseIds } from 'data/queries';
import { resetUserData, setArchived } from 'data/userData';
import { useShowDetail } from 'hooks/useDetailNavigator';
import useContentList, { type ContentListQuery } from 'hooks/useContentList';
import { noticeLists } from 'hooks/useFilteredData';
import usePendingTarget from 'hooks/usePendingTarget';

jest.mock('@react-navigation/native', () => ({
  StackActions: {
    push: (name: string, params: object) => ({ type: 'PUSH', name, params }),
  },
}));
jest.mock('data/queries', () => ({ useCourseIds: jest.fn(() => []) }));
const mockShow = jest.fn();
jest.mock('hooks/useDetailNavigator', () => ({ useShowDetail: jest.fn() }));
jest.mock('hooks/usePendingTarget', () => jest.fn());
jest.mock('components/Toast', () => ({ toast: jest.fn() }));
jest.mock('data/login', () => ({ login: jest.fn() }));

const notices = mockNotices.slice(0, 3).map((n, i) => ({
  ...n,
  id: `n${i}`,
  courseId: 'c1',
  hasRead: i > 0,
}));

const query = (overrides: Partial<ContentListQuery> = {}) => ({
  isFetching: false,
  isPending: false,
  refetch: jest.fn(async () => ({ isError: false })),
  dataUpdatedAt: 42,
  ...overrides,
});

const navigation = { dispatch: jest.fn() };

const render = (q = query()) =>
  renderHook(
    ({ items }: { items: typeof notices }) =>
      useContentList('notice', items, q, navigation, noticeLists),
    { initialProps: { items: notices } },
  );

beforeEach(() => {
  resetUserData();
  jest.mocked(useShowDetail).mockReturnValue(mockShow);
  jest.mocked(useCourseIds).mockReturnValue([]);
});

afterEach(() => {
  useAuthStore.setState(initialAuth);
});

it('splits the items into the filters', async () => {
  setArchived('notice', ['n2'], true);
  const { result } = await render();
  expect(result.current.all.map(n => n.id)).toEqual(['n0', 'n1']);
  expect(result.current.archived.map(n => n.id)).toEqual(['n2']);
  expect(result.current.unread.map(n => n.id)).toEqual(['n0']);
  expect(result.current.listProps).toMatchObject({
    type: 'notice',
    refreshing: false,
    loading: false,
    updatedAt: 42,
  });
});

it('refreshes once the courses are known and on each sign-in', async () => {
  const q = query();
  useAuthStore.setState({ loggedIn: true });
  const hook = await render(q);
  expect(q.refetch).not.toHaveBeenCalled();

  jest.mocked(useCourseIds).mockReturnValue(['c1']);
  await hook.rerender({ items: notices });
  expect(q.refetch).toHaveBeenCalledWith({ cancelRefetch: false });

  await act(() => useAuthStore.setState({ loggedIn: false }));
  expect(q.refetch).toHaveBeenCalledTimes(1);
  await act(() => useAuthStore.setState({ loggedIn: true }));
  expect(q.refetch).toHaveBeenCalledTimes(2);
});

it('shows the loading state only for the first fetch', async () => {
  const { result } = await render(query({ isPending: true, isFetching: true }));
  expect(result.current.listProps.loading).toBe(true);
  expect(result.current.listProps.refreshing).toBe(true);
});

it('opens a tapped item in the detail view', async () => {
  const { result } = await render();
  result.current.listProps.onItemPress({ id: 'n1' });
  expect(mockShow).toHaveBeenCalledWith('NoticeDetail', { id: 'n1' });
});

it('opens an item tapped outside the app, in the detail pane or pushed', async () => {
  await render();
  const open = jest.mocked(usePendingTarget).mock.calls[0];
  expect(open[0]).toBe('notice');
  open[1]('n1', true);
  expect(mockShow).toHaveBeenCalledWith('NoticeDetail', { id: 'n1' });
  open[1]('n2', false);
  expect(navigation.dispatch).toHaveBeenCalledWith({
    type: 'PUSH',
    name: 'NoticeDetail',
    params: { id: 'n2' },
  });
});
