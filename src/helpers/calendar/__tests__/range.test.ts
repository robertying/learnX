import dayjs from 'dayjs';
import { defaultCalendarRange } from 'helpers/calendar/range';

it('offers today and the next four weeks', () => {
  const now = dayjs('2026-11-18T10:30:00+08:00');
  expect(defaultCalendarRange(now)).toEqual({
    start: now.startOf('day'),
    end: now.startOf('day').add(28, 'day'),
  });
  expect(defaultCalendarRange().start.isSame(dayjs(), 'day')).toBe(true);
});
