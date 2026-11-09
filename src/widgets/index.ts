import { Platform } from 'react-native';
import dayjs from 'dayjs';
import type { Widget } from 'expo-widgets';
import { Assignment } from 'data/types/state';
import { t } from 'helpers/i18n';
import { getTargetUrl } from 'helpers/openTarget';
import { UpcomingClass, upNextTimes } from 'helpers/upNext';
import {
  deadlineTimeline,
  upcomingDeadlines,
  UpcomingDeadlines,
} from 'helpers/widgetDeadlines';
import type { DeadlineWidgetProps, UpNextWidgetProps } from 'widgets/props';

// Each layout imports only its own platform's @expo/ui components.
const deadlinesWidget = (): Widget<DeadlineWidgetProps> | undefined =>
  Platform.OS === 'ios'
    ? require('./DeadlinesIOS').default
    : Platform.OS === 'android'
      ? require('./DeadlinesAndroid').default
      : undefined;

const upNextWidget = (): Widget<UpNextWidgetProps> | undefined =>
  Platform.OS === 'ios'
    ? require('./UpNextIOS').default
    : Platform.OS === 'android'
      ? require('./UpNextAndroid').default
      : undefined;

const deadlineProps = (deadlines: UpcomingDeadlines['deadlines']) =>
  deadlines.map(d => ({
    ...d,
    due: dayjs(d.deadline).format(t('widgetDateTimeFormat')),
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
});

/** Deadlines in the Android widget's props; it shows the first four. */
const ANDROID_DEADLINES = 10;

/**
 * Shows the open assignments' deadlines in the home screen widget. Pass no
 * assignments (e.g. after logging out) to empty it.
 */
export function updateDeadlineWidget(
  assignments: Assignment[],
  { hiddenCourses, archived }: { hiddenCourses: string[]; archived: string[] },
) {
  try {
    const widget = deadlinesWidget();
    if (!widget) {
      return;
    }
    const timeline = deadlineTimeline(assignments, { hiddenCourses, archived });
    if (Platform.OS === 'ios') {
      widget.updateTimeline(
        timeline.map(entry => ({
          date: new Date(entry.date),
          props: toProps(entry.deadlines),
        })),
      );
    } else {
      // No timelines: the layout drops what has passed by its own clock as
      // it's redrawn, so it gets a few more than it shows.
      widget.updateSnapshot(
        toProps(
          upcomingDeadlines(assignments, {
            hiddenCourses,
            archived,
            limit: ANDROID_DEADLINES,
          }),
        ),
      );
    }
  } catch (error) {
    // A widget that can't update shouldn't break a refresh or the sync.
    if (__DEV__) {
      console.warn('Failed to update the deadline widget', error);
    }
  }
}

/** The Up Next widget's props, for the classes and assignments still ahead. */
export const upNextProps = (
  classes: UpcomingClass[],
  deadlines: UpcomingDeadlines['deadlines'],
): UpNextWidgetProps => ({
  classes: classes.map(c => ({
    key: c.key,
    courseName: c.courseName,
    location: c.location,
    start: c.start,
    end: c.end,
    time: `${dayjs(c.start).format('HH:mm')}–${dayjs(c.end).format('HH:mm')}`,
    day: dayjs(c.start).format(t('widgetClassDay')),
  })),
  deadlines: deadlineProps(deadlines),
  title: t('widgetUpNext'),
  now: t('todayNow'),
  next: t('todayNext'),
  later: t('widgetLater'),
  due: t('widgetDue'),
  startsIn: t('widgetStartsIn'),
  endsIn: t('widgetEndsIn'),
  tomorrow: t('widgetTomorrow'),
  noClasses: t('widgetNoClasses'),
  url: getTargetUrl({ type: 'today' }),
});

/** What the Up Next widget was last given, so unchanged props are skipped. */
let lastUpNext: string | undefined;

/**
 * Shows the classes still ahead and the next deadlines in the Up Next widget.
 * Pass nothing (e.g. after logging out) to empty it.
 *
 * The widget picks what's on now from the props by its own clock, so iOS gets
 * one set of props in a timeline entry at each class start and end and each
 * deadline. Android has no timelines; its widget redraws every half hour.
 */
export function updateUpNextWidget(
  classes: UpcomingClass[] = [],
  assignments: Assignment[] = [],
  {
    hiddenCourses = [],
    archived = [],
  }: { hiddenCourses?: string[]; archived?: string[] } = {},
) {
  try {
    const widget = upNextWidget();
    if (!widget) {
      return;
    }
    const now = Date.now();
    const { deadlines } = upcomingDeadlines(assignments, {
      hiddenCourses,
      archived,
      now,
      limit: 10,
    });
    const props = upNextProps(classes, deadlines);
    const key = JSON.stringify(props);
    if (key === lastUpNext) {
      return;
    }
    lastUpNext = key;
    if (Platform.OS === 'ios') {
      const times = upNextTimes(
        classes,
        deadlines.map(d => d.deadline),
        { now },
      );
      widget.updateTimeline(
        times.map(date => ({ date: new Date(date), props })),
      );
    } else {
      widget.updateSnapshot(props);
    }
  } catch (error) {
    lastUpNext = undefined;
    // A widget that can't update shouldn't break a refresh.
    if (__DEV__) {
      console.warn('Failed to update the Up Next widget', error);
    }
  }
}
