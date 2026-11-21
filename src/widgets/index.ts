import type { Widget } from 'expo-widgets';
import { Assignment } from 'data/types/state';
import {
  formatDate,
  formatLiteral,
  formatTime,
  isLocaleChinese,
  t,
  type FormatKey,
} from 'helpers/i18n';
import { getTargetUrl } from 'helpers/openTarget';
import { classTimeRange } from 'helpers/schedule';
import { beijingWallClock } from 'helpers/serverTime';
import { UpcomingClass, upNextTimes } from 'helpers/upNext';
import { deadlineUrgencyTimes } from 'helpers/assignments';
import {
  deadlineTimeline,
  upcomingDeadlines,
  UpcomingDeadlines,
} from 'helpers/widgetDeadlines';
import type { DeadlineWidgetProps, UpNextWidgetProps } from 'widgets/props';
import { isAndroid, isApple } from 'helpers/platform';

// Each layout imports only its own platform's @expo/ui components.
const deadlinesWidget = (): Widget<DeadlineWidgetProps> | undefined =>
  isApple()
    ? require('./Deadlines').default
    : isAndroid()
      ? require('./Deadlines.android').default
      : undefined;

const upNextWidget = (): Widget<UpNextWidgetProps> | undefined =>
  isApple()
    ? require('./UpNext').default
    : isAndroid()
      ? require('./UpNext.android').default
      : undefined;

/** The app's language, for the countdowns iOS draws in the widgets. */
const widgetLocale = () => (isLocaleChinese() ? 'zh_Hans' : 'en');

const deadlineProps = (deadlines: UpcomingDeadlines['deadlines']) =>
  deadlines.map(d => ({
    ...d,
    ...deadlineUrgencyTimes(d.deadline),
    due: formatDate(d.deadline, 'widgetDateTimeFormat'),
    url: getTargetUrl({ type: 'assignment', id: d.id }),
  }));

const toProps = ({
  deadlines,
  total,
}: UpcomingDeadlines): DeadlineWidgetProps => ({
  deadlines: deadlineProps(deadlines),
  total,
  title: t('widgetDeadlines'),
  empty: t('widgetNoDeadlines'),
  url: getTargetUrl({ type: 'assignment' }),
  locale: widgetLocale(),
});

/**
 * Deadlines in the widget's props: as many as a large widget shows, and a few
 * to spare when it drops the ones that have passed by its own clock.
 */
const WIDGET_DEADLINES = 10;

/** What the Deadlines widget was last given, so unchanged props are skipped. */
let lastDeadlines: string | undefined;

/**
 * Shows the open assignments' deadlines in the home screen widget. Pass no
 * assignments (e.g. after logging out) to empty it. Throws when the widget
 * can't be updated; `services/surfaces` reports it and tries again.
 *
 * Each update makes the system draw the widget again (on iOS out of a daily
 * budget while the app is in the background), and the assignments change
 * with what the widget doesn't show, such as a favorite, so an update that
 * would show the same is skipped.
 */
export function updateDeadlineWidget(
  assignments: Assignment[],
  { hiddenCourses, archived }: { hiddenCourses: string[]; archived: string[] },
) {
  const widget = deadlinesWidget();
  if (!widget) {
    return;
  }
  const options = { hiddenCourses, archived, limit: WIDGET_DEADLINES };
  if (isApple()) {
    const timeline = deadlineTimeline(assignments, options).map(entry => ({
      date: entry.date,
      props: toProps(entry.deadlines),
    }));
    // The first entry is for now, which moves on with each update: the
    // timeline sent before shows the same while what comes after matches.
    const key = JSON.stringify([timeline[0].props, ...timeline.slice(1)]);
    if (key === lastDeadlines) {
      return;
    }
    widget.updateTimeline(
      timeline.map(entry => ({ ...entry, date: new Date(entry.date) })),
    );
    lastDeadlines = key;
  } else {
    // No timelines: the layout drops what has passed by its own clock as
    // it's redrawn, so it gets a few more than it shows.
    const props = toProps(upcomingDeadlines(assignments, options));
    const key = JSON.stringify(props);
    if (key === lastDeadlines) {
      return;
    }
    widget.updateSnapshot(props);
    lastDeadlines = key;
  }
}

/** The Up Next widget's props, for the classes still ahead. */
export const upNextProps = (classes: UpcomingClass[]): UpNextWidgetProps => ({
  classes: classes.map(c => {
    // Beijing times and days, as Today and Schedule show them
    const start = beijingWallClock(c.start);
    const time = classTimeRange(c);
    const startTime = formatTime(start);
    const withDay = (key: FormatKey, at: string) =>
      formatDate(start, key, { time: formatLiteral(at) });
    return {
      key: c.key,
      courseName: c.courseName,
      location: c.location,
      start: c.start,
      end: c.end,
      time,
      startTime,
      tomorrow: withDay('widgetClassTomorrowFormat', time),
      tomorrowStart: withDay('widgetClassTomorrowFormat', startTime),
      weekday: withDay('widgetClassWeekdayFormat', time),
      weekdayStart: withDay('widgetClassWeekdayFormat', startTime),
      day: withDay('widgetClassDayFormat', time),
      dayStart: withDay('widgetClassDayFormat', startTime),
      url: c.courseId
        ? getTargetUrl({ type: 'course', id: c.courseId })
        : undefined,
    };
  }),
  title: t('widgetNextClass'),
  now: t('todayNow'),
  next: t('widgetNextClass'),
  later: t('widgetLater'),
  startsIn: t('widgetStartsIn'),
  endsIn: t('widgetEndsIn'),
  noClasses: t('widgetNoClasses'),
  url: getTargetUrl({ type: 'today' }),
  locale: widgetLocale(),
});

/** What the Up Next widget was last given, so unchanged props are skipped. */
let lastUpNext: string | undefined;

/**
 * Shows the classes still ahead in the Up Next widget. Pass nothing (e.g.
 * after logging out) to empty it. Throws when the widget can't be updated;
 * `services/surfaces` reports it and tries again.
 *
 * The widget picks what's on now from the props by its own clock, so iOS gets
 * one set of props in a timeline entry at each class start and end. Android
 * has no timelines; its widget redraws every half hour.
 */
export function updateUpNextWidget(classes: UpcomingClass[] = []) {
  const widget = upNextWidget();
  if (!widget) {
    return;
  }
  const props = upNextProps(classes);
  const key = JSON.stringify(props);
  if (key === lastUpNext) {
    return;
  }
  if (isApple()) {
    widget.updateTimeline(
      upNextTimes(classes).map(date => ({ date: new Date(date), props })),
    );
  } else {
    widget.updateSnapshot(props);
  }
  lastUpNext = key;
}
