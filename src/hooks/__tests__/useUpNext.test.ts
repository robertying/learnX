import { renderHook } from '@testing-library/react-native';
import { useWeekSchedule } from 'data/schedule';
import useUpNext from 'hooks/useUpNext';

jest.mock('data/schedule', () => ({ useWeekSchedule: jest.fn() }));
jest.mock('hooks/useClock', () => ({
  // A Wednesday, Beijing time.
  useBeijingDay: () => require('dayjs')('2026-11-11'),
}));

it("keeps this week's and next week's timetable fetched", async () => {
  await renderHook(() => useUpNext());
  const weeks = jest
    .mocked(useWeekSchedule)
    .mock.calls.map(([date]) => require('dayjs')(date).format('YYYY-MM-DD'));
  expect(weeks).toEqual(['2026-11-09', '2026-11-16']);
});
