import { render, screen, userEvent } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';
import dayjs from 'dayjs';
import type { Assignment } from 'data/types/state';
import type { ClassSession } from 'helpers/schedule';
import Today from 'screens/Today';

jest.mock('react-native-screens/experimental', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});
jest.mock('hooks/useAvailableUpdate', () => () => null);
jest.mock('data/login', () => ({ login: jest.fn() }));

const mockSessions: ClassSession[] = [];
const mockAssignments: Partial<Assignment>[] = [];
const query = (data: object) => ({
  ...data,
  isFetching: false,
  refetch: jest.fn(() => Promise.resolve({ isError: false })),
});
jest.mock('data/schedule', () => ({
  useWeekSchedule: () => ({
    sessions: mockSessions,
    source: 'courses',
    week: 9,
    updatedAt: 0,
    fetching: false,
    failed: false,
    refetch: jest.fn(() => Promise.resolve({ isError: false })),
  }),
}));
jest.mock('data/content', () => ({
  useAssignments: () => query({ assignments: mockAssignments }),
  useNotices: () =>
    query({ notices: [{ id: 'n', courseId: 'a', hasRead: false }] }),
  useFiles: () => query({ files: [] }),
}));

const session = (
  key: string,
  courseId: string,
  from: number,
  to: number,
): ClassSession => ({
  key,
  courseName: `Course ${key}`,
  courseId,
  location: 'Room 101',
  start: dayjs().add(from, 'minute').valueOf(),
  end: dayjs().add(to, 'minute').valueOf(),
});

const setup = async () => {
  const navigation = {
    dispatch: jest.fn(),
    push: jest.fn(),
    navigate: jest.fn(),
    setOptions: jest.fn(),
  };
  await render(
    <Today
      navigation={navigation as never}
      route={{ key: 'Today', name: 'Today' } as never}
    />,
  );
  return { navigation };
};

beforeEach(() => {
  mockSessions.length = 0;
  mockAssignments.length = 0;
});

it('shows the current and next class, and opens a course', async () => {
  // Keep both on today, whatever time the test runs.
  jest.useFakeTimers({ now: dayjs().hour(12).minute(0).toDate() });
  mockSessions.push(session('a', 'a', -30, 30), session('b', 'b', 60, 120));
  mockAssignments.push({
    id: 'x',
    courseId: 'a',
    courseName: 'Course a',
    title: 'Homework',
    description: '',
    deadline: dayjs().add(3, 'hour').toISOString(),
    submitted: false,
  });
  const { navigation } = await setup();

  expect(screen.getByText('Now')).toBeOnTheScreen();
  expect(screen.getByText('Next')).toBeOnTheScreen();
  expect(screen.getByText('Homework')).toBeOnTheScreen();
  expect(screen.getByText('1 unread notice')).toBeOnTheScreen();
  expect(
    screen.getByText(
      'Worked out from course times. Holidays and moved classes may be missing.',
    ),
  ).toBeOnTheScreen();

  await userEvent
    .setup({ advanceTimers: jest.advanceTimersByTime })
    .press(screen.getAllByText('Course b')[0]);
  expect(navigation.dispatch).toHaveBeenCalledWith(
    StackActions.push('CourseDetail', { id: 'b' }),
  );
  jest.useRealTimers();
});

it('says when there are no classes or deadlines', async () => {
  await setup();
  expect(screen.getByText('No classes today')).toBeOnTheScreen();
  expect(screen.getByText('Nothing due today or tomorrow')).toBeOnTheScreen();
});
