import { useLayoutEffect } from 'react';
import { useIsFocused } from '@react-navigation/native';
import dayjs from 'dayjs';
import ItemRow from 'components/ItemRow';
import {
  Form,
  FormLink,
  FormScreen,
  FormSection,
  FormText,
} from 'components/Form';
import { SyncStatusSection, useSyncStatus } from 'components/SyncStatus';
import { useAssignments, useFiles, useNotices } from 'data/content';
import { getSettings, setSetting } from 'data/settings';
import { useWeekSchedule } from 'data/schedule';
import { useUserData } from 'data/userData';
import { Assignment } from 'data/types/state';
import {
  deadlineText,
  deadlineTone,
  deadlineUrgency,
  isDueSoon,
} from 'helpers/assignments';
import { formatDate, relativeTime, t, tCount, timeAgo } from 'helpers/i18n';
import {
  ClassSession,
  classDetails,
  currentAndNext,
  sessionsOn,
} from 'helpers/schedule';
import { beijingDate, showsBeijingTime } from 'helpers/serverTime';
import { isShownBy } from 'helpers/shown';
import useDetailNavigator, {
  sameDetailRoot,
  useDetailRoot,
  useShowDetail,
} from 'hooks/useDetailNavigator';
import useItemStepping from 'hooks/useItemStepping';
import usePendingTarget from 'hooks/usePendingTarget';
import { useWindowRestoration } from 'hooks/useWindow';
import { useMinute } from 'hooks/useClock';
import usePullToRefresh from 'hooks/usePullToRefresh';
import useRefreshCommand from 'hooks/useRefreshCommand';
import useSettingsBadge from 'hooks/useSettingsBadge';
import { debugTitle, getTitleOptions } from 'navigation/options';
import useHeaderButtons from 'hooks/useHeaderButtons';
import { settingsTab } from 'navigation/layout';
import {
  DetailStackParams,
  MainStackScreenProps,
  TodayStackParams,
} from 'navigation/types';

type Props = MainStackScreenProps<TodayStackParams, 'Today'>;

const Today: React.FC<Props> = ({ navigation }) => {
  const show = useShowDetail(navigation);
  const now = useMinute();
  // The Schedule a Jump List task asked for (Electron).
  usePendingTarget('schedule', () => show('Schedule'));
  // A window on iPad or Mac comes back to Today after a relaunch.
  useWindowRestoration({ type: 'today' });

  // the timetable follows Beijing days, also on a phone in another time zone
  const schedule = useWeekSchedule(beijingDate(now));
  const classes = sessionsOn(schedule.sessions, now);
  const { current, next } = currentAndNext(classes, now);

  const hiddenIds = useUserData(data => data.hiddenCourses);
  const archived = useUserData(data => data.archived);
  const visible = <T extends { id: string; courseId: string }>(
    items: T[],
    archivedIds: string[],
  ) => items.filter(isShownBy(hiddenIds, archivedIds));

  const assignmentsQuery = useAssignments();
  const noticesQuery = useNotices();
  const filesQuery = useFiles();

  const dueSoon = visible(assignmentsQuery.assignments, archived.assignment)
    .filter(a => !a.submitted && isDueSoon(a.deadline, now))
    .sort((a, b) => dayjs(a.deadline).diff(b.deadline));
  const unreadNotices = visible(noticesQuery.notices, archived.notice).filter(
    n => !n.hasRead,
  ).length;
  const newFiles = visible(filesQuery.files, archived.file).filter(
    f => f.isNew,
  ).length;

  const settingsBadge = useSettingsBadge();
  const syncShown = !!useSyncStatus(schedule.updatedAt);

  const handleRefresh = async () => {
    const results = await Promise.all([
      schedule.refetch(),
      assignmentsQuery.refetch({ cancelRefetch: false }),
      noticesQuery.refetch({ cancelRefetch: false }),
      filesQuery.refetch({ cancelRefetch: false }),
    ]);
    return { isError: results.some(r => r.isError) };
  };
  const pullToRefresh = usePullToRefresh(handleRefresh);

  const openCourse = (courseId: string) =>
    show('CourseDetail', { id: courseId });
  const openAssignment = (assignment: Assignment) =>
    show('AssignmentDetail', { id: assignment.id });
  // The rows count the unread ones, so their tab opens on its Unread filter,
  // which then stays, as when picked from the tab's own filter menu.
  const showUnread = (type: 'notice' | 'file') =>
    setSetting('tabFilterSelections', {
      ...getSettings().tabFilterSelections,
      [type]: 'unread',
    });
  const openUnreadNotices = () => {
    showUnread('notice');
    navigation.navigate('MainTab', {
      screen: 'NoticeStack',
      params: { screen: 'Notices' },
    });
  };
  const openNewFiles = () => {
    showUnread('file');
    navigation.navigate('MainTab', {
      screen: 'FileStack',
      params: { screen: 'Files' },
    });
  };
  const pressOf = (session: ClassSession) =>
    session.courseId ? () => openCourse(session.courseId!) : undefined;

  // Next Item and Previous Item step through the rows that open beside
  // Today, in their order: the classes' courses, Schedule, what's due.
  const detailRows = [
    ...[current, next].flatMap(session =>
      session?.courseId
        ? [{ name: 'CourseDetail' as const, id: session.courseId }]
        : [],
    ),
    { name: 'Schedule' as const, id: undefined },
    ...dueSoon.map(a => ({ name: 'AssignmentDetail' as const, id: a.id })),
  ].filter(
    // The class now and the next can be of one course.
    (row, i, rows) => rows.findIndex(r => sameDetailRoot(r, row)) === i,
  );
  const detailRoot = useDetailRoot();
  // The row whose page is open beside Today shows as selected.
  const opened = (name: keyof DetailStackParams, id?: string) =>
    sameDetailRoot(detailRoot, { name, id });
  const isFocused = useIsFocused();
  const detailNavigator = useDetailNavigator();
  useItemStepping(
    detailRows.length,
    detailRows.findIndex(row => sameDetailRoot(row, detailRoot)),
    index => {
      const row = detailRows[index];
      if (row.name === 'Schedule') {
        show('Schedule');
      } else {
        show(row.name, { id: row.id });
      }
    },
    isFocused && !!detailNavigator,
  );

  // the timetable's day (Beijing), so the date matches the week and the classes
  const dateText = formatDate(beijingDate(now), 'todayDateFormat');
  const subtitle =
    schedule.week && schedule.week > 0
      ? `${dateText} · ${t('todayWeek', { week: schedule.week })}`
      : dateText;

  // Settings sits in the sidebar on Mac and in the Electron app's navigation
  // pane, and behind this button elsewhere.
  const showSettings = !settingsTab;
  const openSettings = () => navigation.push('Settings');
  const refreshButton = useRefreshCommand(pullToRefresh);
  useLayoutEffect(() => {
    navigation.setOptions(getTitleOptions(t('today'), subtitle));
  }, [navigation, subtitle]);
  useHeaderButtons(navigation, 'right', [
    refreshButton,
    // Debug builds: the debug tools, in a group of their own.
    __DEV__ && {
      id: 'debug',
      label: debugTitle,
      icon: 'debug',
      onPress: () => navigation.push('Debug'),
      testID: 'today-debug',
      ownGroup: true,
    },
    {
      id: 'search',
      label: t('search'),
      icon: 'search',
      onPress: () => navigation.navigate('SearchStack'),
      testID: 'today-search',
      // Apart from Settings, as search sits alone in the lists' headers.
      ownGroup: true,
    },
    showSettings && {
      id: 'settings',
      label: t('settings'),
      icon: 'settings',
      badge: settingsBadge,
      onPress: openSettings,
      testID: 'today-settings',
    },
  ]);

  const remaining = classes.filter(s => s.end > now);
  const note =
    schedule.source === 'courses'
      ? t('todayFromCourses')
      : schedule.source === 'calendar' && schedule.failed
        ? t('todayCalendarFailed', {
            time: timeAgo(now, schedule.updatedAt),
          })
        : undefined;
  // Class times are Beijing's; a phone elsewhere says so beside them.
  const classesTitle =
    classes.length > 0 && !showsBeijingTime(now)
      ? `${t('todayClasses')} · ${t('beijingTime')}`
      : t('todayClasses');
  const classCount =
    classes.length === 0
      ? t('todayNoClasses')
      : remaining.length === 0
        ? t('todayNoMoreClasses')
        : tCount('todayOneClass', 'todayClassCount', classes.length);

  return (
    <FormScreen>
      <Form testID="today" onRefresh={pullToRefresh.onRefresh}>
        {/* In the Form, which scrolls under the header and collapses the
            large title; a view above it would sit behind the header. */}
        {syncShown && <SyncStatusSection updatedAt={schedule.updatedAt} />}
        {/* One section, and when a class ends or starts goes above its name
            rather than beside it, so a busy day keeps what's due on screen.
            The whole week is a tap away in Schedule. */}
        <FormSection title={classesTitle} footer={note}>
          {current && (
            <ItemRow
              key={current.key}
              overline={`${t('todayNow')} · ${t('todayEndsIn', {
                time: relativeTime(now, current.end),
              })}`}
              title={current.courseName}
              subtitle={classDetails(current)}
              progress={(now - current.start) / (current.end - current.start)}
              onPress={pressOf(current)}
              opened={opened('CourseDetail', current.courseId)}
            />
          )}
          {next && (
            <ItemRow
              key={next.key}
              overline={`${t('todayNext')} · ${t('todayStartsIn', {
                time: relativeTime(now, next.start),
              })}`}
              title={next.courseName}
              subtitle={classDetails(next)}
              onPress={pressOf(next)}
              opened={opened('CourseDetail', next.courseId)}
            />
          )}
          <FormLink
            icon="calendar"
            title={t('schedule')}
            detail={classCount}
            onPress={() => show('Schedule')}
            opened={opened('Schedule')}
            testID="today-schedule"
          />
        </FormSection>

        <FormSection title={t('todayDueSoon')}>
          {dueSoon.length === 0 ? (
            <FormText title={t('todayNothingDue')} />
          ) : (
            dueSoon.map(assignment => (
              <FormLink
                key={assignment.id}
                item
                title={assignment.title}
                subtitle={assignment.courseName}
                detail={deadlineText(assignment.deadline, now)}
                detailTint={
                  deadlineTone[
                    deadlineUrgency(assignment.deadline, now) ?? 'soon'
                  ]
                }
                onPress={() => openAssignment(assignment)}
                opened={opened('AssignmentDetail', assignment.id)}
              />
            ))
          )}
        </FormSection>

        {(unreadNotices > 0 || newFiles > 0) && (
          <FormSection title={t('todayNew')}>
            {unreadNotices > 0 && (
              <FormLink
                icon="notices"
                title={tCount(
                  'todayOneUnreadNotice',
                  'todayUnreadNotices',
                  unreadNotices,
                )}
                onPress={openUnreadNotices}
              />
            )}
            {newFiles > 0 && (
              <FormLink
                icon="files"
                title={tCount('todayOneNewFile', 'todayNewFiles', newFiles)}
                onPress={openNewFiles}
              />
            )}
          </FormSection>
        )}
      </Form>
    </FormScreen>
  );
};

export default Today;
