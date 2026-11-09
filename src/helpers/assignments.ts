import dayjs from 'dayjs';
import { Assignment } from 'data/types/state';
import { t } from './i18n';

/**
 * "due in 3 days" or "closed 2 days ago", in the app's language, relative to
 * `now` (default: the current time). A deadline more than a year away (some
 * teachers set one decades ahead) shows its date instead.
 */
export const deadlineText = (deadline: string, now?: dayjs.ConfigType) => {
  const n = dayjs(now);
  const dl = dayjs(deadline);
  if (n.isAfter(dl)) {
    return t('deadlinePassed', { time: n.to(dl) });
  }
  return dl.isAfter(n.add(1, 'year'))
    ? t('deadlineOn', { date: dl.format(t('deadlineDateFormat')) })
    : t('deadlineIn', { time: n.to(dl, true) });
};

/**
 * Whether an assignment is still open and due by the end of tomorrow: what
 * Today lists as due soon, and what cards and details mark in red or orange.
 */
export const isDueSoon = (deadline: string, now?: dayjs.ConfigType) => {
  const n = dayjs(now);
  const dl = dayjs(deadline);
  return dl.isAfter(n) && !dl.isAfter(n.add(1, 'day').endOf('day'));
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
