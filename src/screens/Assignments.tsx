import { useCallback, useEffect, useMemo } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StackActions } from '@react-navigation/native';
import dayjs from 'dayjs';
import { AssignmentStackParams } from 'screens/types';
import FilterList from 'components/FilterList';
import AssignmentCard from 'components/AssignmentCard';
import SafeArea from 'components/SafeArea';
import { useAppDispatch, useAppSelector } from 'data/store';
import { useSettings } from 'data/settings';
import { useUserData } from 'data/userData';
import { useCourseIds } from 'data/queries';
import { getAllAssignmentsForCourses } from 'data/actions/assignments';
import { Assignment } from 'data/types/state';
import useDetailNavigator from 'hooks/useDetailNavigator';
import useFilteredData from 'hooks/useFilteredData';
import useToast from 'hooks/useToast';
import { saveAssignmentsToReminderOrCalendar } from 'helpers/event';
import { t } from 'helpers/i18n';

type Props = NativeStackScreenProps<AssignmentStackParams, 'Assignments'>;

const Assignments: React.FC<Props> = ({ navigation }) => {
  const detailNavigator = useDetailNavigator();

  const toast = useToast();

  const dispatch = useAppDispatch();
  const loggedIn = useAppSelector(state => state.auth.loggedIn);
  const courseIds = useCourseIds();
  const hiddenCourseIds = useUserData(data => data.hiddenCourses);
  const favoriteIds = useUserData(data => data.favorites.assignment);
  const archivedIds = useUserData(data => data.archived.assignment);
  const assignmentState = useAppSelector(state => state.assignments);
  const fetching = useAppSelector(state => state.assignments.fetching);
  const assignmentCalendarSync = useSettings(
    settings => settings.assignmentCalendarSync,
  );
  const assignmentReminderSync = useSettings(
    settings => settings.assignmentReminderSync,
  );

  const { all, fav, archived, hidden, unfinished, finished } = useFilteredData({
    data: assignmentState.items,
    fav: favoriteIds,
    archived: archivedIds,
    hidden: hiddenCourseIds,
  });

  const sync = useMemo(() => {
    const now = dayjs();
    return all.filter(assignment => dayjs(assignment.deadline).isAfter(now));
  }, [all]);

  const handleRefresh = useCallback(() => {
    if (loggedIn) {
      dispatch(getAllAssignmentsForCourses(courseIds));
    }
  }, [courseIds, dispatch, loggedIn]);

  const handlePush = useCallback(
    (item: Assignment) => {
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
    },
    [detailNavigator, navigation],
  );

  const handleSync = useCallback(
    async (type: 'calendar' | 'reminder') => {
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
        } else if (
          (err as Error).message === 'Cannot find any calendar source'
        ) {
          toast(t('missingCalendarSource'), 'error');
        } else {
          toast(t('assignmentSyncFailed') + (err as Error).message, 'error');
        }
      }
    },
    [sync, toast],
  );

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  useEffect(() => {
    if (assignmentCalendarSync) {
      handleSync('calendar');
    }
  }, [assignmentCalendarSync, handleSync]);

  useEffect(() => {
    if (assignmentReminderSync) {
      handleSync('reminder');
    }
  }, [assignmentReminderSync, handleSync]);

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
