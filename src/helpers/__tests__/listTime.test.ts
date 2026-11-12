import dayjs from 'dayjs';
import { mockLocale } from 'test-utils/locale';
import { listTime } from 'helpers/listTime';

// a Tuesday, in Asia/Shanghai, where tests run
const today = new Date('2026-03-10T09:30:00+08:00');
const at = (iso: string) => `${iso}+08:00`;

afterEach(() => {
  mockLocale.current = 'en-US';
  dayjs.locale('en');
});

it('shows the time for today, also for a time ahead of the clock', () => {
  expect(listTime(at('2026-03-10T00:00:00'), today)).toBe('00:00');
  expect(listTime(at('2026-03-10T14:05:00'), today)).toBe('14:05');
  expect(listTime(at('2026-03-11T08:00:00'), today)).toBe('08:00');
});

it('says yesterday, then the weekday for the rest of the week', () => {
  expect(listTime(at('2026-03-09T23:59:00'), today)).toBe('Yesterday');
  expect(listTime(at('2026-03-09T00:00:00'), today)).toBe('Yesterday');
  expect(listTime(at('2026-03-08T12:00:00'), today)).toBe('Sunday');
  expect(listTime(at('2026-03-04T00:00:00'), today)).toBe('Wednesday');
});

it('shows the date for anything older than a week', () => {
  expect(listTime(at('2026-03-03T23:59:00'), today)).toBe('3/3/26');
  expect(listTime(at('2025-11-03T10:00:00'), today)).toBe('11/3/25');
});

it('words it in Chinese', () => {
  mockLocale.current = 'zh-CN';
  dayjs.locale('zh-cn');
  expect(listTime(at('2026-03-09T08:00:00'), today)).toBe('昨天');
  expect(listTime(at('2026-03-08T08:00:00'), today)).toBe('星期日');
  expect(listTime(at('2025-11-03T10:00:00'), today)).toBe('2025/11/3');
});
