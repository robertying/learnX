import { render, screen, userEvent } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';
import dayjs from 'dayjs';
import type { Assignment } from 'data/types/state';
import type { ClassSession } from 'helpers/schedule';
import DeviceInfo from 'constants/DeviceInfo';
import { getTitleOptions } from 'navigation/options';
import Today from 'screens/Today';
import { getSettings, setSetting } from 'data/settings';
import { screenProps } from 'test-utils/screenProps';

jest.mock('hooks/useAvailableUpdate', () => () => null);
jest.mock('data/login', () => ({ login: jest.fn() }));

const mockSessions: ClassSession[] = [];
const mockAssignments: Partial<Assignment>[] = [];
const query = (data: object) => ({
  ...data,
  isFetching: false,
  refetch: jest.fn(() => Promise.resolve({ isError: false })),
});
const mockSchedule: Record<string, unknown> = {};
jest.mock('data/schedule', () => ({
  useWeekSchedule: () => ({
    sessions: mockSessions,
    source: 'courses',
    week: 9,
    updatedAt: 0,
    fetching: false,
    failed: false,
    refetch: jest.fn(() => Promise.resolve({ isError: false })),
    ...mockSchedule,
  }),
}));
let mockNotices = [{ id: 'n', courseId: 'a', hasRead: false }];
let mockFiles: { id: string; courseId: string; isNew: boolean }[] = [];
jest.mock('data/content', () => ({
  useAssignments: () => query({ assignments: mockAssignments }),
  useNotices: () => query({ notices: mockNotices }),
  useFiles: () => query({ files: mockFiles }),
}));
jest.mock('navigation/options', () => ({
  ...jest.requireActual('navigation/options'),
  getTitleOptions: jest.fn(() => ({})),
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
      {...screenProps({ navigation, route: { key: 'Today', name: 'Today' } })}
    />,
  );
  return { navigation };
};

beforeEach(() => {
  mockSessions.length = 0;
  mockAssignments.length = 0;
  for (const key of Object.keys(mockSchedule)) {
    delete mockSchedule[key];
  }
  mockNotices = [{ id: 'n', courseId: 'a', hasRead: false }];
  mockFiles = [];
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

  expect(screen.getByText(/^Now · ends in \d+ minutes$/)).toBeOnTheScreen();
  expect(screen.getByText('Next Class · starts in an hour')).toBeOnTheScreen();
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
  await userEvent
    .setup({ advanceTimers: jest.advanceTimersByTime })
    .press(screen.getByText('Homework'));
  expect(navigation.dispatch).toHaveBeenCalledWith(
    StackActions.push('AssignmentDetail', { id: 'x' }),
  );
  jest.useRealTimers();
});

it("counts the day's classes and opens the schedule", async () => {
  jest.useFakeTimers({ now: dayjs().hour(12).minute(0).toDate() });
  mockSessions.push(session('a', 'a', -30, 30), session('b', 'b', 60, 120));
  const { navigation } = await setup();
  await userEvent
    .setup({ advanceTimers: jest.advanceTimersByTime })
    .press(screen.getByText('2 classes today'));
  expect(navigation.dispatch).toHaveBeenCalledWith(
    StackActions.push('Schedule'),
  );
  jest.useRealTimers();
});

it('says the class times are Beijing time on a phone elsewhere', async () => {
  jest.useFakeTimers({ now: dayjs().hour(12).minute(0).toDate() });
  mockSessions.push(session('a', 'a', 60, 120));
  await setup();
  expect(screen.getByText('Classes')).toBeOnTheScreen();

  // Los Angeles (UTC-8)
  jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(480);
  await setup();
  expect(screen.getByText('Classes · Beijing Time')).toBeOnTheScreen();
  jest.useRealTimers();
});

it('says when there are no classes or deadlines', async () => {
  await setup();
  expect(screen.getByText('No classes today')).toBeOnTheScreen();
  expect(screen.getByText('Nothing due today or tomorrow')).toBeOnTheScreen();
});

it("says when the day's classes are over", async () => {
  jest.useFakeTimers({ now: dayjs().hour(20).minute(0).toDate() });
  mockSessions.push(session('a', 'a', -120, -60));
  await setup();
  expect(screen.getByText('No more classes today')).toBeOnTheScreen();
  expect(screen.queryByText('Course a')).toBeNull();
  jest.useRealTimers();
});

it('says when the calendar failed, and leaves out a week before term', async () => {
  Object.assign(mockSchedule, {
    source: 'calendar',
    failed: true,
    week: 0,
    updatedAt: dayjs().subtract(2, 'hour').valueOf(),
  });
  await setup();
  expect(screen.getByText(/2 hours ago/)).toBeOnTheScreen();
  const [, subtitle] = jest.mocked(getTitleOptions).mock.lastCall!;
  expect(subtitle).not.toMatch(/Week/);
});

it('has no note for a calendar that loaded, and counts the week', async () => {
  Object.assign(mockSchedule, { source: 'calendar', failed: false });
  await setup();
  expect(screen.queryByText(/Worked out from course times/)).toBeNull();
  expect(jest.mocked(getTitleOptions).mock.lastCall![1]).toMatch(/Week 9$/);
});

it('counts new notices and files, and opens their lists on Unread', async () => {
  setSetting('tabFilterSelections', {
    ...getSettings().tabFilterSelections,
    notice: 'all',
    file: 'fav',
  });
  mockNotices = [
    { id: 'n1', courseId: 'a', hasRead: false },
    { id: 'n2', courseId: 'a', hasRead: false },
  ];
  mockFiles = [
    { id: 'f1', courseId: 'a', isNew: true },
    { id: 'f2', courseId: 'a', isNew: true },
  ];
  const { navigation } = await setup();
  await userEvent.press(screen.getByText('2 unread notices'));
  expect(navigation.navigate).toHaveBeenCalledWith('MainTab', {
    screen: 'NoticeStack',
    params: { screen: 'Notices' },
  });
  expect(getSettings().tabFilterSelections.notice).toBe('unread');
  expect(getSettings().tabFilterSelections.file).toBe('fav');
  await userEvent.press(screen.getByText('2 new files'));
  expect(navigation.navigate).toHaveBeenCalledWith('MainTab', {
    screen: 'FileStack',
    params: { screen: 'Files' },
  });
  expect(getSettings().tabFilterSelections.file).toBe('unread');
});

it('shows one new file without unread notices', async () => {
  mockNotices = [];
  mockFiles = [{ id: 'f1', courseId: 'a', isNew: true }];
  await setup();
  expect(screen.getByText('1 new file')).toBeOnTheScreen();
  expect(screen.queryByText(/unread notice/)).toBeNull();
});

it('puts a refresh button in the header on a Mac', async () => {
  jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(true);
  const { navigation } = await setup();
  const options = navigation.setOptions.mock.lastCall![0];
  const items = options.unstable_headerRightItems?.() ?? options.headerRight;
  expect(JSON.stringify(items)).toContain('refresh');
});

it('opens search from the header', async () => {
  const { navigation } = await setup();
  const options = navigation.setOptions.mock.calls.findLast(
    ([o]) => o.unstable_headerRightItems,
  )![0];
  const search = options
    .unstable_headerRightItems()
    .find((item: { identifier: string }) => item.identifier === 'search');
  search.onPress();
  expect(navigation.navigate).toHaveBeenCalledWith('SearchStack');
});
