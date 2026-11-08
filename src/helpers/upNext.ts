// What the "Up Next" widget and the "Next class" App Intent show: the classes
// still ahead, as plain values they can store and read without the app.
import type { ClassSession } from 'helpers/schedule';

export interface UpcomingClass {
  key: string;
  courseName: string;
  courseId?: string;
  location: string;
  /** Milliseconds since the epoch. */
  start: number;
  end: number;
}

/**
 * The classes not over yet at `now`, the one going on included, earliest
 * first and each once (the weeks the sessions come from may overlap).
 */
export function upcomingClasses(
  sessions: ClassSession[],
  { now = Date.now(), limit = 30 }: { now?: number; limit?: number } = {},
): UpcomingClass[] {
  const seen = new Set<string>();
  return sessions
    .filter(s => s.end > now)
    .sort(
      (a, b) => a.start - b.start || a.courseName.localeCompare(b.courseName),
    )
    .filter(s => {
      const id = `${s.courseName}:${s.start}`;
      if (seen.has(id)) {
        return false;
      }
      seen.add(id);
      return true;
    })
    .slice(0, limit)
    .map(({ key, courseName, courseId, location, start, end }) => ({
      key,
      courseName,
      courseId,
      location,
      start,
      end,
    }));
}

/**
 * When what the widget shows changes: now, as each class starts and ends, and
 * as each deadline passes. At most `max` times, the first one being `now`.
 */
export function upNextTimes(
  classes: Pick<UpcomingClass, 'start' | 'end'>[],
  deadlines: number[],
  { now = Date.now(), max = 40 }: { now?: number; max?: number } = {},
): number[] {
  const times = new Set<number>();
  for (const c of classes) {
    times.add(c.start);
    times.add(c.end);
  }
  for (const deadline of deadlines) {
    times.add(deadline);
  }
  return [
    now,
    ...[...times].filter(time => time > now).sort((a, b) => a - b),
  ].slice(0, max);
}
