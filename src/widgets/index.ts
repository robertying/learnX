import { Platform } from 'react-native';
import dayjs from 'dayjs';
import type { Widget } from 'expo-widgets';
import { Assignment } from 'data/types/state';
import { isLocaleChinese, t } from 'helpers/i18n';
import { getTargetUrl } from 'helpers/notifications';
import { deadlineTimeline, UpcomingDeadlines } from 'helpers/widgetDeadlines';
import type { DeadlineWidgetProps } from 'widgets/props';

// Each layout imports only its own platform's @expo/ui components.
const deadlinesWidget = (): Widget<DeadlineWidgetProps> | undefined =>
  Platform.OS === 'ios'
    ? require('./DeadlinesIOS').default
    : Platform.OS === 'android'
      ? require('./DeadlinesAndroid').default
      : undefined;

const toProps = ({
  deadlines,
  total,
}: UpcomingDeadlines): DeadlineWidgetProps => ({
  deadlines: deadlines.map(d => ({
    ...d,
    due: dayjs(d.deadline).format(
      isLocaleChinese() ? 'M月D日 HH:mm' : 'MMM D, HH:mm',
    ),
    url: getTargetUrl({ type: 'assignment', id: d.id }),
  })),
  total,
  title: t('widgetDeadlines'),
  empty: t('widgetNoDeadlines'),
  url: getTargetUrl({ type: 'assignment' }),
});

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
      widget.updateSnapshot(toProps(timeline[0].deadlines));
    }
  } catch (error) {
    // A widget that can't update shouldn't break a refresh or the sync.
    if (__DEV__) {
      console.warn('Failed to update the deadline widget', error);
    }
  }
}
