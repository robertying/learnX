import { render, screen, userEvent } from '@testing-library/react-native';
import dayjs from 'dayjs';
import type { ClassSession } from 'helpers/schedule';
import Schedule from 'screens/Schedule';

jest.mock('hooks/useAvailableUpdate', () => () => null);
jest.mock('data/login', () => ({ login: jest.fn() }));

const mockWeeks: Record<string, ClassSession[]> = {};
const mockSources: Record<string, string> = {};
jest.mock('data/schedule', () => ({
  useWeekSchedule: (date: dayjs.Dayjs) => {
    const { startOfWeek } = jest.requireActual('helpers/schedule');
    const week = startOfWeek(date).format('YYYY-MM-DD');
    return {
      sessions: mockWeeks[week] ?? [],
      source: mockSources[week] ?? 'calendar',
      week: 9,
      updatedAt: 0,
      fetching: false,
      failed: false,
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
      navigation={navigation as never}
      route={{ key: 'Schedule', name: 'Schedule' } as never}
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
});
afterEach(() => jest.useRealTimers());

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
      'Worked out from course times. Holidays and moved classes may be missing.',
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

it('says when no classes are coming up', async () => {
  await setup();
  expect(screen.getByText('Today · Sat, Nov 14')).toBeOnTheScreen();
  expect(screen.getByText('No classes in the next 7 days')).toBeOnTheScreen();
});
