import {useCallback, useEffect, useMemo} from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {StackActions} from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import dayjs from 'dayjs';
import {ScreenParams} from 'screens/types';
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

const Assignments: React.FC<
  React.PropsWithChildren<NativeStackScreenProps<ScreenParams, 'Assignments'>>
> = ({navigation}) => {
  const detailNavigator = useDetailNavigator();

  const toast = useToast();

  const dispatch = useAppDispatch();
  const loggedIn = useAppSelector(state => state.auth.loggedIn);
  const courseIds = useAppSelector(
    state => state.courses.items.map(i => i.id),
    (a, b) => JSON.stringify(a) === JSON.stringify(b),
  );
  const hiddenCourseIds = useAppSelector(state => state.courses.hidden);
  const assignmentState = useAppSelector(state => state.assignments);
  const fetching = useAppSelector(state => state.assignments.fetching);
  const assignmentSync = useAppSelector(state => state.settings.assignmentSync);

  const [all, _, fav, archived, hidden, unfinished, finished] = useFilteredData(
    assignmentState.items,
    assignmentState.unread,
    assignmentState.favorites,
    assignmentState.archived,
    assignmentState.pinned,
    hiddenCourseIds,
  );

  const sync = useMemo(
    () => all.filter(assignment => dayjs(assignment.deadline).isAfter(dayjs())),
    [all],
  );

  const handleRefresh = useCallback(() => {
    if (loggedIn && courseIds.length !== 0) {
      dispatch(getAllAssignmentsForCourses(courseIds));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(courseIds), dispatch, loggedIn]);

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

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      response => {
        const data = response.notification.request.content.data as unknown;
        if ((data as Assignment).deadline) {
          const assignment = data as Assignment;
          navigation.navigate('Assignments');
          handlePush(assignment);
        }
      },
    );
    return () => sub.remove();
  }, [handlePush, navigation]);

  useEffect(() => {
    if (assignmentSync) {
      (async () => {
        try {
          await saveAssignmentsToReminderOrCalendar(sync);
        } catch (err) {
          if ((err as Error).message === 'Missing calendar permission') {
            toast(t('assignmentSyncNoCalendarPermission'), 'error');
          } else if ((err as Error).message === 'Missing reminder permission') {
            toast(t('assignmentSyncNoReminderPermission'), 'error');
          } else {
            toast(t('assignmentSyncFailed') + (err as Error).message, 'error');
          }
        }
      })();
    }
  }, [sync, assignmentSync, toast]);

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
