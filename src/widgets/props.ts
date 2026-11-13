import type { WidgetDeadline } from 'helpers/widgetDeadlines';

/** What the app hands the deadline widget. Plain values only. */
export interface DeadlineWidgetProps {
  deadlines: (WidgetDeadline & {
    /** The due time, formatted for widgets that can't format dates. */
    due: string;
    /** The learnx:// link that opens the assignment. */
    url: string;
    /**
     * From when the due date is orange and red, in milliseconds
     * (`deadlineUrgencyTimes` in helpers/assignments).
     */
    soonFrom: number;
    urgentFrom: number;
  })[];
  /** How many open assignments there are in all, listed or not. */
  total: number;
  title: string;
  /** Shown when nothing is due. */
  empty: string;
  /** The learnx:// link that opens the assignment list. */
  url: string;
  /**
   * The app's language as a locale (`en`, `zh_Hans`), for what the system
   * draws (countdowns) on iOS; the widget extension otherwise follows the
   * system language.
   */
  locale?: string;
}

/** A class in the Up Next widget. */
export interface UpNextWidgetClass {
  key: string;
  courseName: string;
  location: string;
  /** Milliseconds since the epoch. */
  start: number;
  end: number;
  /** Start to end, e.g. 08:00–09:35 or 4:00–5:35 PM. */
  time: string;
  /** The start alone, e.g. 08:00 or 4:00 PM, where a range doesn't fit. */
  startTime: string;
  /** Its weekday, e.g. "Mon", shown when it's later this week. */
  weekday: string;
  /** Its day with the date, e.g. "Mon 11/9", shown when it's a week or more away. */
  day: string;
  /** The learnx:// link that opens its course, or none when the course is unknown. */
  url?: string;
}

/**
 * What the app hands the Up Next widget. The widget picks the class on now
 * and the next ones by the time it renders at, so one set of props serves a
 * whole timeline. Plain values only.
 */
export interface UpNextWidgetProps {
  /** The classes not over yet when the props were made, earliest first. */
  classes: UpNextWidgetClass[];
  title: string;
  /** Labels for the class on now and the next one. */
  now: string;
  next: string;
  /** Label for the classes after it. */
  later: string;
  /** Before the countdowns ("Starts in", "Ends in"); iOS only. */
  startsIn: string;
  endsIn: string;
  tomorrow: string;
  /** Shown when no classes are left. */
  noClasses: string;
  /** The learnx:// link that opens Today. */
  url: string;
  /** As in DeadlineWidgetProps. */
  locale?: string;
}
