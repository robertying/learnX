import { useLayoutEffect } from 'react';
import dayjs from 'dayjs';
import {
  Form,
  FormLink,
  FormSection,
  FormText,
  type FormTextProps,
} from 'components/Form';
import SafeArea from 'components/SafeArea';
import SyncStatus from 'components/SyncStatus';
import { getTitleOptions } from 'components/HeaderTitle';
import DeviceInfo from 'constants/DeviceInfo';
import { useAssignments, useFiles, useNotices } from 'data/content';
import { useWeekSchedule } from 'data/schedule';
import { useUserData } from 'data/userData';
import { Assignment } from 'data/types/state';
import { deadlineText, isDueSoon } from 'helpers/assignments';
import { t } from 'helpers/i18n';
import { ClassSession, currentAndNext, sessionsOn } from 'helpers/schedule';
import { beijingDate } from 'helpers/serverTime';
import { useShowDetail } from 'hooks/useDetailNavigator';
import useMinute from 'hooks/useMinute';
import usePullToRefresh from 'hooks/usePullToRefresh';
import useSettingsBadge from 'hooks/useSettingsBadge';
import { headerButtons } from 'navigation/headerButtons';
import { sidebarSplit } from 'navigation/layout';
import { MainStackScreenProps, TodayStackParams } from './types';

type Props = MainStackScreenProps<TodayStackParams, 'Today'>;

const time = (ms: number) => dayjs(ms).format('HH:mm');

type ItemRowProps = FormTextProps & { key: string; onPress?: () => void };

/** A link row when there's somewhere to go, and a plain row otherwise. */
const itemRow = ({ key, onPress, ...row }: ItemRowProps) =>
  onPress ? (
    <FormLink key={key} {...row} onPress={onPress} />
  ) : (
    <FormText key={key} {...row} />
  );

// The room as the course lists it ("六教6A414"), which students know, not
// the full building name the calendar export adds for maps.
const where = (session: ClassSession) => session.location.trim() || undefined;

const Today: React.FC<Props> = ({ navigation }) => {
  const show = useShowDetail(navigation);
  const now = useMinute();

  // the timetable follows Beijing days, also on a phone in another time zone
  const schedule = useWeekSchedule(beijingDate(now));
  const classes = sessionsOn(schedule.sessions, now);
  const { current, next } = currentAndNext(classes, now);

  const hiddenIds = useUserData(data => data.hiddenCourses);
  const archived = useUserData(data => data.archived);
  const visible = <T extends { id: string; courseId: string }>(
    items: T[],
    archivedIds: string[],
  ) =>
    items.filter(
      item =>
        !hiddenIds.includes(item.courseId) && !archivedIds.includes(item.id),
    );

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

  const fetching =
    schedule.fetching ||
    assignmentsQuery.isFetching ||
    noticesQuery.isFetching ||
    filesQuery.isFetching;
  const handleRefresh = async () => {
    const results = await Promise.all([
      schedule.refetch(),
      assignmentsQuery.refetch({ cancelRefetch: false }),
      noticesQuery.refetch({ cancelRefetch: false }),
      filesQuery.refetch({ cancelRefetch: false }),
    ]);
    return { isError: results.some(r => r.isError) };
  };
  const pullToRefresh = usePullToRefresh(handleRefresh, fetching);

  const openCourse = (courseId: string) =>
    show('CourseDetail', { id: courseId });
  const openAssignment = (assignment: Assignment) =>
    show('AssignmentDetail', { id: assignment.id });
  const pressOf = (session: ClassSession) =>
    session.courseId ? () => openCourse(session.courseId!) : undefined;

  // the timetable's day (Beijing), so the date matches the week and the classes
  const dateText = dayjs(beijingDate(now)).format(t('todayDate'));
  const subtitle =
    schedule.week && schedule.week > 0
      ? `${dateText} · ${t('todayWeek', { week: schedule.week })}`
      : dateText;

  // Settings sits in the sidebar on Mac, and behind this button elsewhere.
  const showSettings = !sidebarSplit;
  const openSettings = () => navigation.push('Settings');
  const refreshing = pullToRefresh.refreshing;
  const onRefresh = pullToRefresh.onRefresh;
  useLayoutEffect(() => {
    navigation.setOptions({
      ...getTitleOptions(t('today'), subtitle),
      ...headerButtons('right', [
        DeviceInfo.isMac() && {
          id: 'refresh',
          label: t('refresh'),
          icon: 'refresh',
          sfSymbol: refreshing
            ? 'arrow.trianglehead.2.clockwise.rotate.90'
            : undefined,
          disabled: refreshing,
          onPress: onRefresh,
        },
        showSettings && {
          id: 'settings',
          label: t('settings'),
          icon: 'settings',
          badge: settingsBadge,
          onPress: openSettings,
          testID: 'today-settings',
        },
      ]),
    });
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- handlers read the latest props
  }, [navigation, subtitle, settingsBadge, refreshing, showSettings]);

  const remaining = classes.filter(s => s.end > now);
  const note =
    schedule.source === 'courses'
      ? t('todayFromCourses')
      : schedule.source === 'calendar' && schedule.failed
        ? t('todayCalendarFailed', {
            time: dayjs(schedule.updatedAt).from(now),
          })
        : undefined;
  const span = (session: ClassSession) =>
    `${time(session.start)}–${time(session.end)}`;
  // Time and room on the second line, as Calendar lists events, so the
  // course name gets the row's full width.
  const details = (session: ClassSession) =>
    [span(session), where(session)].filter(Boolean).join(' · ');

  return (
    <SafeArea>
      <SyncStatus updatedAt={schedule.updatedAt} />
      <Form testID="today" onRefresh={pullToRefresh.onRefresh}>
        {current && (
          <FormSection title={t('todayNow')}>
            {itemRow({
              key: current.key,
              title: current.courseName,
              subtitle: details(current),
              detail: t('todayEndsIn', { time: dayjs(now).to(current.end) }),
              progress: (now - current.start) / (current.end - current.start),
              onPress: pressOf(current),
            })}
          </FormSection>
        )}
        {next && (
          <FormSection title={t('todayNext')}>
            {itemRow({
              key: next.key,
              title: next.courseName,
              subtitle: details(next),
              detail: t('todayStartsIn', { time: dayjs(now).to(next.start) }),
              onPress: pressOf(next),
            })}
          </FormSection>
        )}

        <FormSection title={t('todayClasses')} footer={note}>
          {classes.length === 0 ? (
            <FormText title={t('todayNoClasses')} />
          ) : (
            <>
              {remaining.length === 0 && (
                <FormText title={t('todayNoMoreClasses')} />
              )}
              {classes.map(session =>
                itemRow({
                  key: session.key,
                  title: session.courseName,
                  subtitle: details(session),
                  done: session.end <= now,
                  onPress: pressOf(session),
                }),
              )}
            </>
          )}
        </FormSection>

        <FormSection title={t('todayDueSoon')}>
          {dueSoon.length === 0 ? (
            <FormText title={t('todayNothingDue')} />
          ) : (
            dueSoon.map(assignment => (
              <FormLink
                key={assignment.id}
                title={assignment.title}
                subtitle={assignment.courseName}
                detail={deadlineText(assignment.deadline, now)}
                onPress={() => openAssignment(assignment)}
              />
            ))
          )}
        </FormSection>

        {(unreadNotices > 0 || newFiles > 0) && (
          <FormSection title={t('todayNew')}>
            {unreadNotices > 0 && (
              <FormLink
                icon={{ ios: 'bell', android: 'bell-outline' }}
                title={
                  unreadNotices === 1
                    ? t('todayOneUnreadNotice')
                    : t('todayUnreadNotices', { count: unreadNotices })
                }
                onPress={() =>
                  navigation.navigate('MainTab', {
                    screen: 'NoticeStack',
                    params: { screen: 'Notices' },
                  })
                }
              />
            )}
            {newFiles > 0 && (
              <FormLink
                icon={{ ios: 'doc', android: 'file-outline' }}
                title={
                  newFiles === 1
                    ? t('todayOneNewFile')
                    : t('todayNewFiles', { count: newFiles })
                }
                onPress={() =>
                  navigation.navigate('MainTab', {
                    screen: 'FileStack',
                    params: { screen: 'Files' },
                  })
                }
              />
            )}
          </FormSection>
        )}
      </Form>
    </SafeArea>
  );
};

export default Today;
