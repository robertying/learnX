import { useEffect, useEffectEvent } from 'react';
import { StackActions } from '@react-navigation/native';
import dayjs from 'dayjs';
import { AssignmentStackParams, MainStackScreenProps } from 'screens/types';
import FilterList from 'components/FilterList';
import AssignmentCard from 'components/AssignmentCard';
import SafeArea from 'components/SafeArea';
import { useSettings } from 'data/settings';
import { useUserData } from 'data/userData';
import { useCourseIds } from 'data/queries';
import { useLoggedIn } from 'data/auth';
import { useAssignments } from 'data/content';
import { Assignment } from 'data/types/state';
import useDetailNavigator from 'hooks/useDetailNavigator';
import useNotificationTarget from 'hooks/useNotificationTarget';
import useFilteredData from 'hooks/useFilteredData';
import { toast } from 'components/Toast';
import { saveAssignmentsToReminderOrCalendar } from 'helpers/event';
import { t } from 'helpers/i18n';

type Props = MainStackScreenProps<AssignmentStackParams, 'Assignments'>;

const Assignments: React.FC<Props> = ({ navigation }) => {
  const detailNavigator = useDetailNavigator();

  const loggedIn = useLoggedIn();
  const courseIds = useCourseIds();
  const hiddenCourseIds = useUserData(data => data.hiddenCourses);
  const favoriteIds = useUserData(data => data.favorites.assignment);
  const archivedIds = useUserData(data => data.archived.assignment);
  const { assignments, isFetching: fetching, refetch } = useAssignments();
  const assignmentCalendarSync = useSettings(
    settings => settings.assignmentCalendarSync,
  );
  const assignmentReminderSync = useSettings(
    settings => settings.assignmentReminderSync,
  );

  const { all, fav, archived, hidden, unfinished, finished } = useFilteredData({
    data: assignments,
    fav: favoriteIds,
    archived: archivedIds,
    hidden: hiddenCourseIds,
  });

  const handleRefresh = () => {
    if (loggedIn) {
      refetch({ cancelRefetch: false });
    }
  };

  const refresh = useEffectEvent(handleRefresh);

  const handlePush = (item: Pick<Assignment, 'id'>) => {
    if (detailNavigator) {
      detailNavigator.dispatch(
        StackActions.replace('AssignmentDetail', {
          id: item.id,
          disableAnimation: true,
        }),
      );
    } else {
      navigation.push('AssignmentDetail', { id: item.id });
    }
  };

  useNotificationTarget('assignment', id => handlePush({ id }));

  const handleSync = useEffectEvent(async (type: 'calendar' | 'reminder') => {
    const now = dayjs();
    const sync = all.filter(assignment =>
      dayjs(assignment.deadline).isAfter(now),
    );
    try {
      await saveAssignmentsToReminderOrCalendar(type, sync);
    } catch (err) {
      if ((err as Error).message === 'Missing calendar permission') {
        toast(t('assignmentSyncNoCalendarPermission'), 'error');
      } else if ((err as Error).message === 'Missing reminder permission') {
        toast(t('assignmentSyncNoReminderPermission'), 'error');
      } else if (
        (err as Error).message ===
        'CALENDAR permission is required to do this operation.'
      ) {
        toast(t('assignmentSyncNoCalendarPermission'), 'error');
      } else if ((err as Error).message === 'Cannot find any calendar source') {
        toast(t('missingCalendarSource'), 'error');
      } else {
        toast(t('assignmentSyncFailed') + (err as Error).message, 'error');
      }
    }
  });

  // Refreshes on mount, on sign-in and when the semester's courses change.
  useEffect(() => {
    if (courseIds.length > 0) {
      refresh();
    }
  }, [courseIds, loggedIn]);

  // Sync again whenever the assignments change.
  useEffect(() => {
    if (assignmentCalendarSync) {
      handleSync('calendar');
    }
  }, [all, assignmentCalendarSync]);

  useEffect(() => {
    if (assignmentReminderSync) {
      handleSync('reminder');
    }
  }, [all, assignmentReminderSync]);

  return (
    <SafeArea>
      <FilterList
        type="assignment"
        defaultSelected="unfinished"
        unfinished={unfinished}
        finished={finished}
        all={all}
        fav={fav}
        archived={archived}
        hidden={hidden}
        itemComponent={AssignmentCard}
        navigation={navigation}
        onItemPress={handlePush}
        refreshing={fetching}
        onRefresh={handleRefresh}
      />
    </SafeArea>
  );
};

export default Assignments;
