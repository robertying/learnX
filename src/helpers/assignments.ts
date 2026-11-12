import dayjs from 'dayjs';
import { Assignment } from 'data/types/state';
import { t, tCount, timeFormat } from './i18n';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * "due in 3 hours", "due in 2 days" or "closed 2 days ago", in the app's
 * language, relative to `now` (default: the current time). Under a day it
 * counts minutes or hours; from there it counts calendar days, so "1 day"
 * always means tomorrow. A deadline more than a year away (some teachers set
 * one decades ahead) shows its date instead.
 */
export const deadlineText = (deadline: string, now?: dayjs.ConfigType) => {
  const n = dayjs(now);
  const dl = dayjs(deadline);
  if (!dl.isAfter(n)) {
    return t('deadlinePassed', { time: n.to(dl) });
  }
  if (dl.isAfter(n.add(1, 'year'))) {
    return t('deadlineOn', { date: dl.format(t('deadlineDateFormat')) });
  }
  const left = dl.diff(n);
  if (left < HOUR) {
    const minutes = Math.max(1, Math.floor(left / (60 * 1000)));
    return tCount('deadlineInOneMinute', 'deadlineInMinutes', minutes);
  }
  if (left < DAY) {
    return tCount(
      'deadlineInOneHour',
      'deadlineInHours',
      Math.floor(left / HOUR),
    );
  }
  const days = dl.startOf('day').diff(n.startOf('day'), 'day');
  return days > 25
    ? t('deadlineIn', { time: n.to(dl, true) })
    : tCount('deadlineInOneDay', 'deadlineInDays', days);
};

/**
 * When an open deadline turns orange (the start of the day before it) and
 * when it turns red (a day before it), in milliseconds.
 */
export const deadlineUrgencyTimes = (deadline: dayjs.ConfigType) => {
  const dl = dayjs(deadline);
  return {
    soonFrom: dl.subtract(1, 'day').startOf('day').valueOf(),
    urgentFrom: dl.valueOf() - DAY,
  };
};

/**
 * How pressing an open deadline is, the one rule every surface follows:
 * `urgent` (red) under a day left, when it's counted in hours; `soon`
 * (orange) when it's due by the end of tomorrow, what Today lists. A deadline
 * that has passed, or an assignment already submitted, is neither.
 */
export type DeadlineUrgency = 'urgent' | 'soon';

export const deadlineUrgency = (
  deadline: string,
  now?: dayjs.ConfigType,
  submitted = false,
): DeadlineUrgency | undefined => {
  const n = dayjs(now).valueOf();
  const dl = dayjs(deadline).valueOf();
  if (submitted || dl <= n) {
    return undefined;
  }
  const { soonFrom, urgentFrom } = deadlineUrgencyTimes(dl);
  return n > urgentFrom ? 'urgent' : n >= soonFrom ? 'soon' : undefined;
};

/** The status hue of each urgency, on every surface. */
export const deadlineTone = {
  urgent: 'red',
  soon: 'orange',
} as const satisfies Record<DeadlineUrgency, string>;

/** Whether an open deadline is due by the end of tomorrow (Today's list). */
export const isDueSoon = (deadline: string, now?: dayjs.ConfigType) =>
  deadlineUrgency(deadline, now) !== undefined;

/**
 * The deadline's day and time from the point of view of `now`: "today at
 * 23:59", "tomorrow at 23:59" or "Nov 12 23:59", for text that stays put
 * once written, like a reminder.
 */
export const deadlineDayTime = (
  deadline: dayjs.ConfigType,
  now?: dayjs.ConfigType,
) => {
  const n = dayjs(now);
  const dl = dayjs(deadline);
  const time = dl.format(timeFormat());
  return dl.isSame(n, 'day')
    ? t('deadlineToday', { time })
    : dl.isSame(n.add(1, 'day'), 'day')
      ? t('deadlineTomorrow', { time })
      : t('deadlineAt', { date: dl.format(t('shortDateTimeFormat')) });
};

/**
 * Upcoming assignments first, earliest deadline first, followed by past
 * assignments, latest deadline first. Ties are broken by id for stability.
 */
export function sortAssignments(assignments: Assignment[]): Assignment[] {
  const nowUnix = dayjs().unix();
  const deadlines = new Map(
    assignments.map(a => [a.id, dayjs(a.deadline).unix()]),
  );
  const upcoming: Assignment[] = [];
  const past: Assignment[] = [];
  for (const a of assignments) {
    if (deadlines.get(a.id)! > nowUnix) {
      upcoming.push(a);
    } else {
      past.push(a);
    }
  }
  upcoming.sort(
    (a, b) =>
      deadlines.get(a.id)! - deadlines.get(b.id)! || a.id.localeCompare(b.id),
  );
  past.sort(
    (a, b) =>
      deadlines.get(b.id)! - deadlines.get(a.id)! || b.id.localeCompare(a.id),
  );
  return [...upcoming, ...past];
}
