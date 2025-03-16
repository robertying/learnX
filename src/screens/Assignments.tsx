import {useCallback, useEffect, useMemo} from 'react';
import {Platform} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {StackActions} from '@react-navigation/native';
import dayjs from 'dayjs';
import {AssignmentStackParams} from 'screens/types';
import FilterList from 'components/FilterList';
import AssignmentCard from 'components/AssignmentCard';
import SafeArea from 'components/SafeArea';
import {useAppDispatch, useAppSelector} from 'data/store';
import {getAllAssignmentsForCourses} from 'data/actions/assignments';
import {Assignment} from 'data/types/state';
import useDetailNavigator from 'hooks/useDetailNavigator';
import useFilteredData from 'hooks/useFilteredData';
import useToast from 'hooks/useToast';
import {saveAssignmentsToReminderOrCalendar} from 'helpers/event';
import {t} from 'helpers/i18n';

type Props = NativeStackScreenProps<AssignmentStackParams, 'Assignments'>;

const Assignments: React.FC<Props> = ({navigation}) => {
  const detailNavigator = useDetailNavigator();

  const toast = useToast();

  const dispatch = useAppDispatch();
  const loggedIn = useAppSelector(state => state.auth.loggedIn);
  const courseIds = useAppSelector(
    state => state.courses.items.map(i => i.id),
    (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort()),
  );
  const hiddenCourseIds = useAppSelector(state => state.courses.hidden);
  const assignmentState = useAppSelector(state => state.assignments);
  const fetching = useAppSelector(state => state.assignments.fetching);
  const assignmentCalendarSync = useAppSelector(
    state => state.settings.assignmentCalendarSync,
  );
  const assignmentReminderSync = useAppSelector(
    state => state.settings.assignmentReminderSync,
  );

  const {all, fav, archived, hidden, unfinished, finished} = useFilteredData({
    data: assignmentState.items,
    fav: assignmentState.favorites,
    archived: assignmentState.archived,
    hidden: hiddenCourseIds,
  });

  const sync = useMemo(
    () => all.filter(assignment => dayjs(assignment.deadline).isAfter(dayjs())),
    [all],
  );

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
            ...item,
            disableAnimation: true,
          }),
        );
      } else {
        navigation.push('AssignmentDetail', item);
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
