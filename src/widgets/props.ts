import type { WidgetDeadline } from 'helpers/widgetDeadlines';

/** What the app hands the deadline widget. Plain values only. */
export interface DeadlineWidgetProps {
  deadlines: (WidgetDeadline & {
    /** The due time, formatted for widgets that can't format dates. */
    due: string;
  })[];
  /** How many open assignments there are in all, listed or not. */
  total: number;
  title: string;
  /** Shown when nothing is due. */
  empty: string;
}
