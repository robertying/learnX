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
  /**
   * When it is, from tomorrow on, as the widget shows it by how far away it
   * is: the time with its day ("明天上午8:00–9:35", "Tomorrow 8:00–9:35 AM"),
   * its weekday when it's later this week ("周一 08:00–09:35", "Mon
   * 08:00–09:35") and its date from a week on ("11月9日 周一 08:00–09:35",
   * "Mon 11/9 08:00–09:35"). Each `…Start` has the start alone, as
   * `startTime`. The app writes them, as dates are written only through
   * helpers/i18n.
   */
  tomorrow: string;
  tomorrowStart: string;
  weekday: string;
  weekdayStart: string;
  day: string;
  dayStart: string;
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
  /** Shown when no classes are left. */
  noClasses: string;
  /** The learnx:// link that opens Today. */
  url: string;
  /** As in DeadlineWidgetProps. */
  locale?: string;
}
