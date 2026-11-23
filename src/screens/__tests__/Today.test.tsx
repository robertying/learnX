import { setPendingTarget } from 'hooks/usePendingTarget';
import { act, render, screen, userEvent } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';
import dayjs from 'dayjs';
import type { Assignment } from 'data/types/state';
import type { ClassSession } from 'helpers/schedule';
import DeviceInfo from 'constants/DeviceInfo';
import useDetailNavigator, { useDetailRoot } from 'hooks/useDetailNavigator';
import { useWindowTitle } from 'hooks/useWindow';
import type { AppCommand } from 'modules/menus';
import { getTitleOptions } from 'navigation/options';
import Today from 'screens/Today';
import { getSettings, setSetting } from 'data/settings';
import { useAuthStore } from 'data/auth';
import { screenProps } from 'test-utils/screenProps';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useIsFocused: () => true,
}));

jest.mock('hooks/useAvailableUpdate', () => () => null);
jest.mock('hooks/useWindow', () => ({
  ...jest.requireActual('hooks/useWindow'),
  useWindowTitle: jest.fn(),
}));
jest.mock('hooks/useDetailNavigator', () => ({
  ...jest.requireActual('hooks/useDetailNavigator'),
  __esModule: true,
  default: jest.fn(() => undefined),
  useDetailRoot: jest.fn(() => undefined),
}));

// The native module's events, as AppCommands.swift sends them.
const mockListeners = new Set<(event: { command: AppCommand }) => void>();
jest.mock('modules/menus', () => ({
  Menus: {
    addListener: (
      _event: 'onCommand',
      listener: (event: { command: AppCommand }) => void,
    ) => {
      mockListeners.add(listener);
      return { remove: () => mockListeners.delete(listener) };
    },
  },
}));
const choose = (command: AppCommand) =>
  act(() => mockListeners.forEach(l => l({ command })));
jest.mock('data/login', () => ({ login: jest.fn() }));

const mockSessions: ClassSession[] = [];
const mockAssignments: Partial<Assignment>[] = [];
const query = (data: object) => ({
  ...data,
  isFetching: false,
  refetch: jest.fn(() => Promise.resolve({ isError: false })),
});
const mockSchedule: Record<string, unknown> = {};
const mockScheduleRefetch = jest.fn(() => Promise.resolve({ isError: false }));
jest.mock('data/schedule', () => ({
  useWeekSchedule: () => ({
    sessions: mockSessions,
    source: 'courses',
    week: 9,
    updatedAt: 0,
    fetching: false,
    failed: false,
    refetch: mockScheduleRefetch,
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
const mockCourses: { id: string; name: string }[] = [];
jest.mock('data/queries', () => ({
  ...jest.requireActual('data/queries'),
  useCourse: (id: string) => mockCourses.find(course => course.id === id),
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
  mockListeners.clear();
  mockSessions.length = 0;
  mockAssignments.length = 0;
  mockCourses.length = 0;
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

  expect(screen.getByText(/^Now · Ends in \d+ minutes$/)).toBeOnTheScreen();
  expect(screen.getByText('Next Class · Starts in an hour')).toBeOnTheScreen();
  expect(screen.getByText('Homework')).toBeOnTheScreen();
  expect(screen.getByText('1 unread notice')).toBeOnTheScreen();
  expect(
    screen.getByText(
      'Based on class times. Holidays and rescheduled classes may not be reflected.',
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
});

it('counts the classes left once one has ended', async () => {
  jest.useFakeTimers({ now: dayjs().hour(12).minute(0).toDate() });
  mockSessions.push(
    session('a', 'a', -120, -60),
    session('b', 'b', -30, 30),
    session('c', 'c', 60, 120),
  );
  await setup();
  expect(screen.getByText('2 classes left today')).toBeOnTheScreen();

  mockSessions.splice(1, 1);
  await setup();
  expect(screen.getByText('1 class left today')).toBeOnTheScreen();
});

it('opens the schedule a Jump List task asked for', async () => {
  setPendingTarget({ type: 'schedule', id: 'week' });
  const { navigation } = await setup();
  expect(navigation.dispatch).toHaveBeenCalledWith(
    StackActions.push('Schedule'),
  );
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
  expect(screen.queryByText(/Based on class times/)).toBeNull();
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

describe('menu bar commands', () => {
  const initialAuth = useAuthStore.getState();
  const homework = (id: string, hours: number) => ({
    id,
    courseId: 'a',
    courseName: 'Course a',
    title: `Homework ${id}`,
    description: '',
    deadline: dayjs().add(hours, 'hour').toISOString(),
    submitted: false,
  });

  afterEach(async () => {
    jest.mocked(useDetailNavigator).mockReturnValue(undefined);
    jest.mocked(useDetailRoot).mockReturnValue(undefined);
    await act(() => useAuthStore.setState(initialAuth));
  });

  const opened = (navigation: { dispatch: jest.Mock }) =>
    navigation.dispatch.mock.lastCall?.[0];

  it("steps through the rows that open beside Today, from the one that's open", async () => {
    jest.useFakeTimers({ now: dayjs().hour(12).minute(0).toDate() });
    // The class now and the next are of one course, which is one stop.
    mockSessions.push(session('a', 'a', -30, 30), session('b', 'a', 60, 120));
    mockAssignments.push(homework('x', 3), homework('y', 5));
    jest
      .mocked(useDetailNavigator)
      .mockReturnValue({ push: jest.fn(), show: jest.fn() });
    let { navigation } = await setup();

    // Nothing open: from either end
    await choose('nextItem');
    expect(opened(navigation)).toEqual(
      StackActions.push('CourseDetail', { id: 'a' }),
    );
    await choose('previousItem');
    expect(opened(navigation)).toEqual(
      StackActions.push('AssignmentDetail', { id: 'y' }),
    );
    await screen.unmount();

    jest
      .mocked(useDetailRoot)
      .mockReturnValue({ name: 'CourseDetail', id: 'a' });
    ({ navigation } = await setup());
    await choose('nextItem');
    expect(opened(navigation)).toEqual(StackActions.push('Schedule'));
    await screen.unmount();

    jest.mocked(useDetailRoot).mockReturnValue({ name: 'Schedule' });
    ({ navigation } = await setup());
    await choose('nextItem');
    expect(opened(navigation)).toEqual(
      StackActions.push('AssignmentDetail', { id: 'x' }),
    );
    await screen.unmount();

    // Not past the end
    jest
      .mocked(useDetailRoot)
      .mockReturnValue({ name: 'AssignmentDetail', id: 'y' });
    ({ navigation } = await setup());
    await choose('nextItem');
    expect(navigation.dispatch).not.toHaveBeenCalled();
  });

  it('shows the row whose page is open beside Today as selected', async () => {
    jest.useFakeTimers({ now: dayjs().hour(12).minute(0).toDate() });
    mockSessions.push(session('a', 'a', -30, 30));
    mockAssignments.push(homework('x', 3), homework('y', 5));
    jest
      .mocked(useDetailRoot)
      .mockReturnValue({ name: 'AssignmentDetail', id: 'y' });
    await setup();
    expect(
      screen.getByRole('button', { name: /Homework y/, selected: true }),
    ).toBeTruthy();
    for (const name of [/Homework x/, /^Now/, /^Schedule/]) {
      expect(
        screen.getByRole('button', { name, selected: false }),
      ).toBeTruthy();
    }
  });

  it('leaves Next Item to the screen on top without a detail pane', async () => {
    jest.useFakeTimers({ now: dayjs().hour(12).minute(0).toDate() });
    mockSessions.push(session('a', 'a', -30, 30));
    const { navigation } = await setup();
    await choose('nextItem');
    expect(navigation.dispatch).not.toHaveBeenCalled();
  });

  it('refreshes with ⌘R', async () => {
    await act(() => useAuthStore.setState({ loggedIn: true }));
    await setup();
    await choose('refresh');
    expect(mockScheduleRefetch).toHaveBeenCalled();
  });
});

const headerItem = (
  navigation: { setOptions: jest.Mock },
  identifier: string,
) =>
  navigation.setOptions.mock.calls
    .findLast(([o]) => o.unstable_headerRightItems)![0]
    .unstable_headerRightItems()
    .find((item: { identifier: string }) => item.identifier === identifier);

it('opens the current class, and leaves a class with no course untappable', async () => {
  jest.useFakeTimers({ now: dayjs().hour(12).minute(0).toDate() });
  mockSessions.push(session('a', 'a', -30, 30), session('b', '', 60, 120));
  const { navigation } = await setup();
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await user.press(screen.getAllByText('Course a')[0]);
  expect(navigation.dispatch).toHaveBeenCalledWith(
    StackActions.push('CourseDetail', { id: 'a' }),
  );
  navigation.dispatch.mockClear();
  await user.press(screen.getAllByText('Course b')[0]);
  expect(navigation.dispatch).not.toHaveBeenCalled();
});

it('opens Settings and, in debug builds, the debug tools from the header', async () => {
  const { navigation } = await setup();
  headerItem(navigation, 'settings').onPress();
  expect(navigation.push).toHaveBeenCalledWith('Settings');
  headerItem(navigation, 'debug').onPress();
  expect(navigation.push).toHaveBeenCalledWith('Debug');
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

it('names the window after what is open beside Today, else Today', async () => {
  await setup();
  expect(useWindowTitle).toHaveBeenLastCalledWith('Today');

  mockAssignments.push({ id: 'h1', courseId: 'a', title: 'Homework 1' });
  jest
    .mocked(useDetailRoot)
    .mockReturnValue({ name: 'AssignmentDetail', id: 'h1' });
  await setup();
  expect(useWindowTitle).toHaveBeenLastCalledWith('Homework 1');

  mockCourses.push({ id: 'c1', name: 'Calculus' });
  jest
    .mocked(useDetailRoot)
    .mockReturnValue({ name: 'CourseDetail', id: 'c1' });
  await setup();
  expect(useWindowTitle).toHaveBeenLastCalledWith('Calculus');

  jest.mocked(useDetailRoot).mockReturnValue({ name: 'Schedule' });
  await setup();
  expect(useWindowTitle).toHaveBeenLastCalledWith('Schedule');
});
