import { render, screen, userEvent } from '@testing-library/react-native';
import dayjs from 'dayjs';
import type { ClassSession } from 'helpers/schedule';
import DeviceInfo from 'constants/DeviceInfo';
import Schedule from 'screens/Schedule';
import { screenProps } from 'test-utils/screenProps';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useIsFocused: () => true,
}));

jest.mock('hooks/useAvailableUpdate', () => () => null);
jest.mock('data/login', () => ({ login: jest.fn() }));

const mockWeeks: Record<string, ClassSession[]> = {};
const mockSources: Record<string, string> = {};
/** When each week's failed update last succeeded. */
const mockFailed: Record<string, number> = {};
jest.mock('data/schedule', () => ({
  useWeekSchedule: (date: dayjs.Dayjs) => {
    const { startOfWeek } = jest.requireActual('helpers/schedule');
    const week = startOfWeek(date).format('YYYY-MM-DD');
    return {
      sessions: mockWeeks[week] ?? [],
      source: mockSources[week] ?? 'calendar',
      week: 9,
      updatedAt: mockFailed[week] ?? 0,
      fetching: false,
      failed: week in mockFailed,
      refetch: jest.fn(() => Promise.resolve({ isError: false })),
    };
  },
}));

// Noon in Beijing on a Saturday, so the next seven days span two weeks.
const NOW = new Date('2026-11-14T04:00:00Z');

const session = (
  key: string,
  courseId: string,
  date: string,
  time: string,
  location = 'Room 101',
): ClassSession => {
  const start = new Date(`${date}T${time}:00+08:00`).valueOf();
  return {
    key,
    courseName: `Course ${key}`,
    courseId,
    location,
    start,
    end: start + 95 * 60 * 1000,
  };
};

const setup = async () => {
  const navigation = { push: jest.fn(), setOptions: jest.fn() };
  await render(
    <Schedule
      {...screenProps({
        navigation,
        route: { key: 'Schedule', name: 'Schedule' },
      })}
    />,
  );
  return { navigation };
};

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  for (const key of Object.keys(mockWeeks)) {
    delete mockWeeks[key];
  }
  for (const key of Object.keys(mockSources)) {
    delete mockSources[key];
  }
  for (const key of Object.keys(mockFailed)) {
    delete mockFailed[key];
  }
});

it("lists the next seven days' classes by day, from both weeks", async () => {
  mockWeeks['2026-11-09'] = [
    session('past', 'p', '2026-11-13', '08:00'),
    session('a', 'a', '2026-11-14', '08:00'),
    session('b', 'b', '2026-11-14', '13:30'),
  ];
  mockWeeks['2026-11-16'] = [
    session('c', 'c', '2026-11-16', '09:50'),
    session('late', 'l', '2026-11-21', '09:50'),
  ];
  mockSources['2026-11-16'] = 'courses';
  const { navigation } = await setup();

  expect(screen.getByText('Today · Sat, Nov 14')).toBeOnTheScreen();
  expect(screen.getByText('Mon, Nov 16')).toBeOnTheScreen();
  // Sunday has no classes, so no section
  expect(screen.queryByText(/Tomorrow/)).toBeNull();
  expect(screen.queryByText('Course past')).toBeNull();
  expect(screen.queryByText('Course late')).toBeNull();
  expect(screen.getByText('Course c')).toBeOnTheScreen();
  expect(
    screen.getByText(
      'Based on course times. Holidays and rescheduled classes may not be reflected.',
    ),
  ).toBeOnTheScreen();

  await userEvent
    .setup({ advanceTimers: jest.advanceTimersByTime })
    .press(screen.getByText('Course b'));
  expect(navigation.push).toHaveBeenCalledWith('CourseDetail', { id: 'b' });
});

it('shows the time alone without a room, and opens nothing without a course', async () => {
  mockWeeks['2026-11-09'] = [session('a', '', '2026-11-14', '08:00', ' ')];
  const { navigation } = await setup();
  expect(screen.getByText('08:00–09:35')).toBeOnTheScreen();
  await userEvent
    .setup({ advanceTimers: jest.advanceTimersByTime })
    .press(screen.getByText('Course a'));
  expect(navigation.push).not.toHaveBeenCalled();
});

it('says the times are Beijing time on a phone elsewhere', async () => {
  mockWeeks['2026-11-09'] = [session('a', 'a', '2026-11-15', '08:00')];
  // Los Angeles (UTC-8)
  jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(480);
  await setup();
  // On the first day with classes, not on an empty today
  expect(screen.getByText('Today · Sat, Nov 14')).toBeOnTheScreen();
  expect(
    screen.getByText('Tomorrow · Sun, Nov 15 · Beijing Time'),
  ).toBeOnTheScreen();
});

it('says when no classes are coming up', async () => {
  await setup();
  expect(screen.getByText('Today · Sat, Nov 14')).toBeOnTheScreen();
  expect(screen.getByText('No classes in the next 7 days')).toBeOnTheScreen();
});

it("says when the timetable couldn't update, from the oldest week kept", async () => {
  mockFailed['2026-11-09'] = NOW.valueOf() - 2 * 60 * 60 * 1000;
  mockFailed['2026-11-16'] = NOW.valueOf() - 3 * 60 * 60 * 1000;
  await setup();
  expect(
    screen.getByText(
      "Couldn't update the schedule. Showing the one from 3 hours ago.",
    ),
  ).toBeOnTheScreen();
});

it('prefers the note on classes worked out from courses', async () => {
  mockFailed['2026-11-09'] = NOW.valueOf() - 2 * 60 * 60 * 1000;
  mockSources['2026-11-16'] = 'courses';
  await setup();
  expect(screen.queryByText(/Couldn't update/)).toBeNull();
  expect(screen.getByText(/Based on course times/)).toBeOnTheScreen();
});

it('puts a refresh button in the header on a Mac', async () => {
  jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(true);
  const { navigation } = await setup();
  const options = navigation.setOptions.mock.lastCall![0];
  const items = options.unstable_headerRightItems?.() ?? options.headerRight;
  expect(JSON.stringify(items)).toContain('refresh');
});
