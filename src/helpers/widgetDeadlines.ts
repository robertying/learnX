import { isShownBy } from 'helpers/shown';
import dayjs from 'dayjs';
import { Assignment } from 'data/types/state';
import { deadlineUrgencyTimes } from 'helpers/assignments';

export interface WidgetDeadline {
  id: string;
  title: string;
  courseName: string;
  /** Milliseconds since the epoch, so the widget can format it itself. */
  deadline: number;
}

export interface UpcomingDeadlines {
  deadlines: WidgetDeadline[];
  /** How many open assignments there are in all, listed or not. */
  total: number;
}

/**
 * The unsubmitted assignments still open for submission, earliest deadline
 * first, without hidden courses and archived assignments. This is what the
 * deadline widget shows, as plain values it can store.
 */
export function upcomingDeadlines(
  assignments: Assignment[],
  {
    hiddenCourses,
    archived,
    now = Date.now(),
    limit = 6,
  }: {
    hiddenCourses: string[];
    archived: string[];
    now?: number;
    limit?: number;
  },
): UpcomingDeadlines {
  const isShown = isShownBy(hiddenCourses, archived);
  const due = assignments
    .filter(a => !a.submitted && isShown(a))
    .map(a => ({
      id: a.id,
      title: a.title,
      courseName: a.courseName,
      deadline: dayjs(a.deadline).valueOf(),
    }))
    .filter(a => a.deadline > now)
    .sort((a, b) => a.deadline - b.deadline || a.id.localeCompare(b.id));
  return { deadlines: due.slice(0, limit), total: due.length };
}

/**
 * The times after `now` at which a widget showing these deadlines changes:
 * each deadline, when it drops off, and when it turns orange and red
 * (`deadlineUrgencyTimes`), earliest first.
 */
export function deadlineChangeTimes(deadlines: number[], now: number) {
  const times = new Set<number>();
  for (const deadline of deadlines) {
    const { soonFrom, urgentFrom } = deadlineUrgencyTimes(deadline);
    times.add(soonFrom).add(urgentFrom).add(deadline);
  }
  return [...times].filter(time => time > now).sort((a, b) => a - b);
}

/**
 * The deadlines as of now and as of each time they change, so a widget
 * colors a deadline as it nears and drops it once it's due without the app
 * running.
 */
export function deadlineTimeline(
  assignments: Assignment[],
  options: {
    hiddenCourses: string[];
    archived: string[];
    now?: number;
    limit?: number;
    /** At most this many entries, the first one included. */
    entries?: number;
  },
): { date: number; deadlines: UpcomingDeadlines }[] {
  const { now = Date.now(), entries = 24 } = options;
  const first = upcomingDeadlines(assignments, { ...options, now });
  const times = [
    now,
    ...deadlineChangeTimes(
      upcomingDeadlines(assignments, {
        ...options,
        now,
        limit: entries - 1,
      }).deadlines.map(d => d.deadline),
      now,
    ),
  ].slice(0, entries);
  return times.map((date, i) => ({
    date,
    deadlines:
      i === 0
        ? first
        : upcomingDeadlines(assignments, { ...options, now: date }),
  }));
}
