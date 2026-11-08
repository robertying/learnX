import dayjs from 'dayjs';
import { Assignment } from 'data/types/state';
import { t } from './i18n';

/** "due in 3 days" or "closed 2 days ago", in the app's language */
export const deadlineText = (deadline: string, now = dayjs()) => {
  const dl = dayjs(deadline);
  return now.isAfter(dl)
    ? t('deadlinePassed', { time: now.to(dl) })
    : t('deadlineIn', { time: now.to(dl, true) });
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
