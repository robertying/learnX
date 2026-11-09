import { useLayoutEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackHeaderItem } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import Badge from 'components/Badge';
import {
  Form,
  FormLink,
  FormSection,
  FormText,
  type FormTextProps,
} from 'components/Form';
import IconButton from 'components/IconButton';
import SafeArea from 'components/SafeArea';
import SyncStatus from 'components/SyncStatus';
import { getTitleOptions } from 'components/HeaderTitle';
import DeviceInfo from 'constants/DeviceInfo';
import { useAssignments, useFiles, useNotices } from 'data/content';
import { useWeekSchedule } from 'data/schedule';
import { useUserData } from 'data/userData';
import { Assignment } from 'data/types/state';
import { deadlineText } from 'helpers/assignments';
import { t } from 'helpers/i18n';
import { ClassSession, currentAndNext, sessionsOn } from 'helpers/schedule';
import { sanitizeLocation } from 'helpers/eventDetails';
import useDetailNavigator from 'hooks/useDetailNavigator';
import useMinute from 'hooks/useMinute';
import usePullToRefresh from 'hooks/usePullToRefresh';
import useSettingsBadge from 'hooks/useSettingsBadge';
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

const where = (session: ClassSession) =>
  session.location ? sanitizeLocation(session.location) : undefined;

const Today: React.FC<Props> = ({ navigation }) => {
  const detailNavigator = useDetailNavigator();
  const now = useMinute();
  const today = dayjs(now);

  const schedule = useWeekSchedule(now);
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

  const dueBy = today.add(1, 'day').endOf('day');
  const dueSoon = visible(assignmentsQuery.assignments, archived.assignment)
    .filter(a => {
      const deadline = dayjs(a.deadline);
      return (
        !a.submitted && deadline.isAfter(today) && deadline.isBefore(dueBy)
      );
    })
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

  const openCourse = (courseId: string) => {
    if (detailNavigator) {
      detailNavigator.replace('CourseDetail', {
        id: courseId,
        disableAnimation: true,
      });
    } else {
      navigation.push('CourseDetail', { id: courseId });
    }
  };
  const openAssignment = (assignment: Assignment) => {
    if (detailNavigator) {
      detailNavigator.replace('AssignmentDetail', {
        id: assignment.id,
        disableAnimation: true,
      });
    } else {
      navigation.push('AssignmentDetail', { id: assignment.id });
    }
  };
  const pressOf = (session: ClassSession) =>
    session.courseId ? () => openCourse(session.courseId!) : undefined;

  const dateText = today.format(t('todayDate'));
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
      unstable_headerRightItems: () => [
        ...(DeviceInfo.isMac()
          ? ([
              {
                type: 'button',
                identifier: 'refresh',
                label: t('refresh'),
                icon: {
                  type: 'sfSymbol',
                  name: refreshing
                    ? 'arrow.trianglehead.2.clockwise.rotate.90'
                    : 'arrow.clockwise',
                },
                disabled: refreshing,
                onPress: onRefresh,
              },
            ] satisfies NativeStackHeaderItem[])
          : []),
        ...(showSettings
          ? ([
              {
                type: 'button',
                identifier: 'settings',
                label: t('settings'),
                icon: { type: 'sfSymbol', name: 'gearshape' },
                badge: settingsBadge ? { value: '' } : undefined,
                onPress: openSettings,
              },
            ] satisfies NativeStackHeaderItem[])
          : []),
      ],
      headerRight: showSettings
        ? () => (
            <View>
              <IconButton
                testID="today-settings"
                accessibilityLabel={t('settings')}
                icon="cog-outline"
                onPress={openSettings}
              />
              {settingsBadge && <Badge size={8} style={styles.badge} />}
            </View>
          )
        : undefined,
    });
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- handlers read the latest props
  }, [navigation, subtitle, settingsBadge, refreshing, showSettings]);

  const remaining = classes.filter(s => s.end > now);
  const note =
    schedule.source === 'courses'
      ? t('todayFromCourses')
      : schedule.source === 'calendar' && schedule.failed
        ? t('todayCalendarFailed', {
            time: dayjs(schedule.updatedAt).fromNow(),
          })
        : undefined;
  const span = (session: ClassSession) =>
    `${time(session.start)}–${time(session.end)}`;

  return (
    <SafeArea>
      <SyncStatus updatedAt={schedule.updatedAt} />
      <Form testID="today" onRefresh={pullToRefresh.onRefresh}>
        {current && (
          <FormSection title={t('todayNow')}>
            {itemRow({
              key: current.key,
              title: current.courseName,
              subtitle: [span(current), where(current)]
                .filter(Boolean)
                .join(' · '),
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
              subtitle: [span(next), where(next)].filter(Boolean).join(' · '),
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
                  subtitle: where(session),
                  detail: span(session),
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

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});

export default Today;
