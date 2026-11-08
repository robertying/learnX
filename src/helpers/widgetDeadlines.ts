import dayjs from 'dayjs';
import { Assignment } from 'data/types/state';

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
  const hidden = new Set(hiddenCourses);
  const archivedIds = new Set(archived);
  const due = assignments
    .filter(
      a => !a.submitted && !hidden.has(a.courseId) && !archivedIds.has(a.id),
    )
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
 * The deadlines as of now and as of each of the next deadlines, so a widget
 * drops an assignment once it's due without the app running.
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
  const { now = Date.now(), entries = 10 } = options;
  const first = upcomingDeadlines(assignments, { ...options, now });
  const times = [
    now,
    ...new Set(
      upcomingDeadlines(assignments, {
        ...options,
        now,
        limit: entries - 1,
      }).deadlines.map(d => d.deadline),
    ),
  ];
  return times.map((date, i) => ({
    date,
    deadlines:
      i === 0
        ? first
        : upcomingDeadlines(assignments, { ...options, now: date }),
  }));
}
