import { act, render } from '@testing-library/react-native';
import dayjs from 'dayjs';
import { initialAuth, useAuthStore } from 'data/auth';
import { useAssignments, useFiles, useNotices } from 'data/content';
import { useCourses } from 'data/queries';
import { resetSettings } from 'data/settings';
import {
  resetUserData,
  setCourseHidden,
  setCurrentSemester,
  useUserDataStore,
} from 'data/userData';
import { getSemesterTextFromId } from 'helpers/semester';
import { useShowDetail } from 'hooks/useDetailNavigator';
import Courses from 'screens/Courses';

let mockList: Record<string, any> = {};
jest.mock('components/FilterList', () => (props: object) => {
  mockList = props;
  return null;
});
jest.mock('data/content', () => ({
  useNotices: jest.fn(),
  useAssignments: jest.fn(),
  useFiles: jest.fn(),
}));
jest.mock('data/queries', () => ({ useCourses: jest.fn() }));
jest.mock('data/login', () => ({ login: jest.fn() }));
const mockShow = jest.fn();
jest.mock('hooks/useDetailNavigator', () => ({
  useShowDetail: jest.fn(() => mockShow),
}));

const courses = [
  { id: 'calc', name: '微积分' },
  { id: 'phys', name: '物理' },
];
const refetch = jest.fn();
const coursesResult = (overrides: object = {}) =>
  jest.mocked(useCourses).mockReturnValue({
    courses,
    isFetching: false,
    isPending: false,
    refetch,
    dataUpdatedAt: 42,
    ...overrides,
  } as never);

const navigation = {};
const renderScreen = () =>
  render(<Courses navigation={navigation as never} route={{} as never} />);

const future = dayjs().add(1, 'day').toISOString();
const past = dayjs().subtract(1, 'day').toISOString();

beforeEach(() => {
  resetSettings();
  resetUserData();
  coursesResult();
  jest.mocked(useNotices).mockReturnValue({
    notices: [
      { courseId: 'calc', hasRead: false },
      { courseId: 'calc', hasRead: true },
      { courseId: 'phys', hasRead: false },
    ],
  } as never);
  jest.mocked(useAssignments).mockReturnValue({
    assignments: [
      { courseId: 'calc', submitted: false, deadline: future },
      { courseId: 'calc', submitted: true, deadline: future },
      { courseId: 'calc', submitted: false, deadline: past },
    ],
  } as never);
  jest.mocked(useFiles).mockReturnValue({
    files: [
      { courseId: 'phys', isNew: true },
      { courseId: 'phys', isNew: false },
    ],
  } as never);
});
afterEach(() => act(() => useAuthStore.setState(initialAuth)));

it("counts each course's unread notices, open assignments and new files", async () => {
  await renderScreen();
  expect(mockList.all).toEqual([
    expect.objectContaining({
      id: 'calc',
      unreadNoticeCount: 1,
      unfinishedAssignmentCount: 1,
      unreadFileCount: 0,
    }),
    expect.objectContaining({
      id: 'phys',
      unreadNoticeCount: 1,
      unfinishedAssignmentCount: 0,
      unreadFileCount: 1,
    }),
  ]);
  expect(mockList.updatedAt).toBe(42);
});

it('orders the courses as arranged, and keeps hidden ones apart', async () => {
  useUserDataStore.setState({ courseOrder: ['phys', 'calc'] });
  setCourseHidden('calc', true);
  await renderScreen();
  expect(mockList.all.map((c: { id: string }) => c.id)).toEqual(['phys']);
  expect(mockList.hidden.map((c: { id: string }) => c.id)).toEqual(['calc']);
});

it('names the semester under the title', async () => {
  await renderScreen();
  expect(mockList.defaultSubtitle).toBeUndefined();
  await act(() => setCurrentSemester('2026-2027-1'));
  await renderScreen();
  expect(mockList.defaultSubtitle).toBe(getSemesterTextFromId('2026-2027-1'));
});

it('shows loading only for a first fetch', async () => {
  coursesResult({ isPending: true, isFetching: true });
  await renderScreen();
  expect(mockList.loading).toBe(true);
  coursesResult({ isPending: false, isFetching: true });
  await renderScreen();
  expect(mockList.loading).toBe(false);
});

it('refetches on a pull only with a session and a semester', async () => {
  useAuthStore.setState({ loggedIn: true });
  await renderScreen();
  await act(() => mockList.onRefresh());
  expect(refetch).not.toHaveBeenCalled();

  await act(() => setCurrentSemester('2026-2027-1'));
  await renderScreen();
  await act(() => mockList.onRefresh());
  expect(refetch).toHaveBeenCalled();
});

it('opens a course in the detail view', async () => {
  await renderScreen();
  mockList.onItemPress(courses[1]);
  expect(useShowDetail).toHaveBeenCalledWith(navigation);
  expect(mockShow).toHaveBeenCalledWith('CourseDetail', { id: 'phys' });
});
