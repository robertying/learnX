import { useLayoutEffect } from 'react';
import { Platform, RefreshControl, StyleSheet, View } from 'react-native';
import type { NativeStackHeaderItem } from '@react-navigation/native-stack';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import dayjs from 'dayjs';
import AssignmentCard from 'components/AssignmentCard';
import Badge from 'components/Badge';
import Divider from 'components/Divider';
import IconButton from 'components/IconButton';
import SafeArea from 'components/SafeArea';
import ScrollView from 'components/ScrollView';
import SyncStatus from 'components/SyncStatus';
import { Caption, Paragraph, Subheading, Text, Title } from 'components/Text';
import Touchable from 'components/Touchable';
import { getTitleOptions } from 'components/HeaderTitle';
import DeviceInfo from 'constants/DeviceInfo';
import { useAssignments, useFiles, useNotices } from 'data/content';
import { useWeekSchedule } from 'data/schedule';
import { useUserData } from 'data/userData';
import { Assignment } from 'data/types/state';
import { t } from 'helpers/i18n';
import { ClassSession, currentAndNext, sessionsOn } from 'helpers/schedule';
import { sanitizeLocation } from 'helpers/eventDetails';
import useDetailNavigator from 'hooks/useDetailNavigator';
import useMinute from 'hooks/useMinute';
import usePullToRefresh from 'hooks/usePullToRefresh';
import useSettingsBadge from 'hooks/useSettingsBadge';
import { sidebarSplit } from 'navigation/layout';
import { useTheme } from 'theme';
import { MainStackScreenProps, TodayStackParams } from './types';

type Props = MainStackScreenProps<TodayStackParams, 'Today'>;

const time = (ms: number) => dayjs(ms).format('HH:mm');

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <Subheading style={styles.sectionHeader} accessibilityRole="header">
    {title}
  </Subheading>
);

/** The class going on now or coming up next, with how long until it changes. */
const Highlight: React.FC<{
  session: ClassSession;
  current: boolean;
  now: number;
  onPress?: () => void;
}> = ({ session, current, now, onPress }) => {
  const theme = useTheme();
  const when = current
    ? t('todayEndsIn', { time: dayjs(now).to(session.end) })
    : t('todayStartsIn', { time: dayjs(now).to(session.start) });
  const progress = current
    ? (now - session.start) / (session.end - session.start)
    : 0;

  return (
    <Touchable
      style={[
        styles.highlight,
        { backgroundColor: theme.colors.surfaceVariant },
      ]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <Caption style={{ color: theme.colors.primary }}>
        {current ? t('todayNow') : t('todayNext')}
      </Caption>
      <Title numberOfLines={1}>{session.courseName}</Title>
      <Paragraph numberOfLines={1}>
        {`${time(session.start)}–${time(session.end)}`}
        {session.location ? ` · ${sanitizeLocation(session.location)}` : ''}
      </Paragraph>
      <Caption>{when}</Caption>
      {current && (
        <View
          style={[
            styles.progressTrack,
            { backgroundColor: theme.colors.outlineVariant },
          ]}
        >
          <View
            style={[
              styles.progressBar,
              {
                backgroundColor: theme.colors.primary,
                width: `${Math.round(progress * 100)}%`,
              },
            ]}
          />
        </View>
      )}
    </Touchable>
  );
};

const ClassRow: React.FC<{
  session: ClassSession;
  now: number;
  onPress?: () => void;
}> = ({ session, now, onPress }) => {
  const theme = useTheme();
  const over = session.end <= now;

  return (
    <Touchable
      style={[styles.row, over && styles.over]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <View style={styles.rowTime}>
        <Text style={{ color: theme.colors.onSurfaceHigh }}>
          {time(session.start)}
        </Text>
        <Caption>{time(session.end)}</Caption>
      </View>
      <View style={styles.rowBody}>
        <Text
          numberOfLines={1}
          style={[styles.rowTitle, { color: theme.colors.onSurfaceHigh }]}
        >
          {session.courseName}
        </Text>
        {session.location ? (
          <Caption numberOfLines={1}>
            {sanitizeLocation(session.location)}
          </Caption>
        ) : null}
      </View>
      {over && (
        <MaterialCommunityIcons
          name="check"
          size={18}
          color={theme.colors.onSurfaceMedium}
        />
      )}
    </Touchable>
  );
};

const LinkRow: React.FC<{
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  onPress: () => void;
}> = ({ icon, title, onPress }) => {
  const theme = useTheme();
  return (
    <Touchable style={styles.row} onPress={onPress} accessibilityRole="button">
      <MaterialCommunityIcons
        name={icon}
        size={20}
        color={theme.colors.primary}
        style={styles.rowIcon}
      />
      <Text style={[styles.rowBody, { color: theme.colors.onSurfaceHigh }]}>
        {title}
      </Text>
      <MaterialCommunityIcons
        name="chevron-right"
        size={20}
        color={theme.colors.onSurfaceMedium}
      />
    </Touchable>
  );
};

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

  return (
    <SafeArea>
      <ScrollView
        testID="today"
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={pullToRefresh.refreshing}
            onRefresh={pullToRefresh.onRefresh}
          />
        }
      >
        <SyncStatus updatedAt={schedule.updatedAt} />
        {schedule.source === 'courses' ? (
          <Caption style={styles.note}>{t('todayFromCourses')}</Caption>
        ) : schedule.source === 'calendar' && schedule.failed ? (
          <Caption style={styles.note}>
            {t('todayCalendarFailed', {
              time: dayjs(schedule.updatedAt).fromNow(),
            })}
          </Caption>
        ) : null}

        {current && (
          <Highlight
            session={current}
            current
            now={now}
            onPress={pressOf(current)}
          />
        )}
        {next && (
          <Highlight
            session={next}
            current={false}
            now={now}
            onPress={pressOf(next)}
          />
        )}

        <SectionHeader title={t('todayClasses')} />
        {classes.length === 0 ? (
          <Caption style={styles.empty}>{t('todayNoClasses')}</Caption>
        ) : (
          <>
            {remaining.length === 0 && (
              <Caption style={styles.empty}>{t('todayNoMoreClasses')}</Caption>
            )}
            {classes.map((session, i) => (
              <View key={session.key}>
                {i > 0 && <Divider />}
                <ClassRow
                  session={session}
                  now={now}
                  onPress={pressOf(session)}
                />
              </View>
            ))}
          </>
        )}

        <SectionHeader title={t('todayDueSoon')} />
        {dueSoon.length === 0 ? (
          <Caption style={styles.empty}>{t('todayNothingDue')}</Caption>
        ) : (
          dueSoon.map(assignment => (
            <AssignmentCard
              key={assignment.id}
              data={assignment}
              disableSwipe
              onPress={() => openAssignment(assignment)}
            />
          ))
        )}

        {(unreadNotices > 0 || newFiles > 0) && (
          <>
            <SectionHeader title={t('todayNew')} />
            {unreadNotices > 0 && (
              <LinkRow
                icon="bell-outline"
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
            {unreadNotices > 0 && newFiles > 0 && <Divider />}
            {newFiles > 0 && (
              <LinkRow
                icon="file-outline"
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
          </>
        )}
      </ScrollView>
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: 24,
  },
  note: {
    marginHorizontal: 16,
    marginTop: 8,
  },
  highlight: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: 4,
  },
  sectionHeader: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 4,
    fontWeight: Platform.OS === 'ios' ? '700' : 'bold',
  },
  empty: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  over: {
    opacity: 0.5,
  },
  rowTime: {
    width: 56,
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
  },
  rowIcon: {
    marginRight: 12,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});

export default Today;
