import type { WidgetDeadline } from 'helpers/widgetDeadlines';

/** What the app hands the deadline widget. Plain values only. */
export interface DeadlineWidgetProps {
  deadlines: (WidgetDeadline & {
    /** The due time, formatted for widgets that can't format dates. */
    due: string;
    /** The learnx:// link that opens the assignment. */
    url: string;
  })[];
  /** How many open assignments there are in all, listed or not. */
  total: number;
  title: string;
  /** Shown when nothing is due. */
  empty: string;
  /** The learnx:// link that opens the assignment list. */
  url: string;
}

/** A class in the Up Next widget. */
export interface UpNextWidgetClass {
  key: string;
  courseName: string;
  location: string;
  /** Milliseconds since the epoch. */
  start: number;
  end: number;
  /** Start to end, e.g. 08:00–09:35. */
  time: string;
  /** Its day, e.g. "Mon 11/9", shown when it isn't today or tomorrow. */
  day: string;
}

/**
 * What the app hands the Up Next widget. The widget picks the class on now
 * and the next ones by the time it renders at, so one set of props serves a
 * whole timeline. Plain values only.
 */
export interface UpNextWidgetProps {
  /** The classes not over yet when the props were made, earliest first. */
  classes: UpNextWidgetClass[];
  /** The open assignments, earliest deadline first. */
  deadlines: DeadlineWidgetProps['deadlines'];
  title: string;
  /** Labels for the class on now and the next one. */
  now: string;
  next: string;
  /** Labels for the classes after it and the next deadline. */
  later: string;
  due: string;
  /** Before the countdowns ("Starts in", "Ends in"); iOS only. */
  startsIn: string;
  endsIn: string;
  tomorrow: string;
  /** Shown when no classes are left. */
  noClasses: string;
  /** The learnx:// link that opens Today. */
  url: string;
}
