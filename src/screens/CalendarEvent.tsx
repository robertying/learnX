import {useMemo, useState} from 'react';
import {Alert, Platform, ScrollView, StyleSheet} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Caption} from 'react-native-paper';
import {DatePickerModal} from 'react-native-paper-dates';
import type {
  CalendarDate,
  RangeChange,
} from 'react-native-paper-dates/lib/typescript/Date/Calendar';
import dayjs from 'dayjs';
import TableCell from 'components/TableCell';
import SafeArea from 'components/SafeArea';
import {useAppDispatch, useAppSelector} from 'data/store';
import {clearEventIds, setSetting} from 'data/actions/settings';
import {dataSource} from 'data/source';
import {
  getAndRequestPermission,
  removeCalendars,
  saveAssignmentsToReminderOrCalendar,
  saveCoursesToCalendar,
} from 'helpers/event';
import {getLocale, t} from 'helpers/i18n';
import useToast from 'hooks/useToast';
import useNavigationAnimation from 'hooks/useNavigationAnimation';
import useFilteredData from 'hooks/useFilteredData';
import {ScreenParams} from './types';

const CalendarEvent: React.FC<
  React.PropsWithChildren<NativeStackScreenProps<ScreenParams, 'CalendarEvent'>>
> = props => {
  const toast = useToast();

  const dispatch = useAppDispatch();
  const assignmentSync = useAppSelector(state => state.settings.assignmentSync);
  const syncAssignmentsToCalendar = useAppSelector(
    state => state.settings.syncAssignmentsToCalendar,
  );
  const alarms = useAppSelector(state => state.settings.alarms);
  const graduate = useAppSelector(state => state.settings.graduate);
  const hiddenCourseIds = useAppSelector(state => state.courses.hidden);
  const assignmentState = useAppSelector(state => state.assignments);

  const [all] = useFilteredData(
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

  const [courseSyncing, setCourseSyncing] = useState(false);
  const [assignmentSyncing, setAssignmentSyncing] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [startDate, setStartDate] = useState<CalendarDate>(dayjs().toDate());
  const [endDate, setEndDate] = useState<CalendarDate>(
    dayjs().add(28, 'day').toDate(),
  );

  const handleDatePickerDismiss = () => {
    setDatePickerOpen(false);
  };

  const handleDatePickerOpen = () => {
    setDatePickerOpen(true);
  };

  const handleSyncRangeChange: RangeChange = ({startDate, endDate}) => {
    setStartDate(startDate);
    setEndDate(endDate);
  };

  const handleSyncRangeConfirm: RangeChange = ({startDate, endDate}) => {
    handleDatePickerDismiss();
    syncCourse(startDate, endDate);
  };

  const syncCourse = async (start?: Date, end?: Date) => {
    if (!start || !end) {
      return;
    }

    setCourseSyncing(true);

    const startDate = dayjs(start);
    const endDate = dayjs(end);

    try {
      await dataSource.login();

      const events = await dataSource.getCalendar(
        startDate.format('YYYYMMDD'),
        endDate.format('YYYYMMDD'),
        graduate,
      );

      await saveCoursesToCalendar(events, startDate, endDate);
      toast(t('courseScheduleSyncSucceeded'), 'success');
    } catch (err) {
      if ((err as Error).message === 'Missing calendar permission') {
        toast(t('courseScheduleSyncNoCalendarPermission'), 'error');
      } else if ((err as Error).message === 'Missing reminder permission') {
        toast(t('courseScheduleSyncNoReminderPermission'), 'error');
      } else {
        toast(t('courseScheduleSyncRepetitiveError'), 'error');
      }
    } finally {
      setCourseSyncing(false);
    }
  };

  const handleAssignmentSync = async (enabled: boolean) => {
    if (enabled) {
      setAssignmentSyncing(true);

      try {
        await saveAssignmentsToReminderOrCalendar(sync);
      } catch (err) {
        if ((err as Error).message === 'Missing calendar permission') {
          toast(t('assignmentSyncNoCalendarPermission'), 'error');
        } else if ((err as Error).message === 'Missing reminder permission') {
          toast(t('assignmentSyncNoReminderPermission'), 'error');
        } else if (
          (err as Error).message === 'Cannot find any calendar source'
        ) {
          toast(t('missingCalendarSource'), 'error');
        } else {
          toast(t('assignmentSyncFailed') + (err as Error).message, 'error');
        }
      } finally {
        setAssignmentSyncing(false);
      }
    }
    dispatch(setSetting('assignmentSync', enabled));
  };

  const handleSyncTargetChange = async (value: boolean) => {
    dispatch(clearEventIds());
    dispatch(setSetting('syncAssignmentsToCalendar', value));
    if (value) {
      await getAndRequestPermission('calendar');
    }
  };

  const handleCalendarDelete = () => {
    Alert.alert(
      t('deleteSyncedCalendarsAndReminders'),
      t('deleteSyncedCalendarsAndRemindersConfirmation'),
      [
        {
          text: t('cancel'),
          style: 'cancel',
        },
        {
          text: t('ok'),
          onPress: async () => {
            try {
              await removeCalendars();
              toast(t('deleteSucceeded'), 'success');
            } catch (err) {
              if ((err as Error).message === 'Missing calendar permission') {
                toast(t('deleteFailedNoCalendarPermission'), 'error');
              } else if (
                (err as Error).message === 'Missing reminder permission'
              ) {
                toast(t('deleteFailedNoReminderPermission'), 'error');
              } else {
                toast(t('deleteFailed') + (err as Error).message, 'error');
              }
            }
          },
        },
      ],
      {cancelable: true},
    );
  };

  useNavigationAnimation(props);

  return (
    <SafeArea>
      <ScrollView contentContainerStyle={styles.scrollViewPaddings}>
        <TableCell
          iconName="people"
          primaryText={t('graduate')}
          switchValue={graduate}
          onSwitchValueChange={value => dispatch(setSetting('graduate', value))}
          type="switch"
        />
        <TableCell
          iconName="event"
          primaryText={t('syncCourseSchedule')}
          type="none"
          onPress={handleDatePickerOpen}
          loading={courseSyncing}
        />
        <TableCell
          iconName="access-alarm"
          primaryText={t('classAlarm')}
          switchValue={alarms.courseAlarm}
          onSwitchValueChange={value =>
            dispatch(setSetting('alarms', {...alarms, courseAlarm: value}))
          }
          type="switch"
        />
        {alarms.courseAlarm && (
          <TableCell
            primaryText={t('classAlarmBefore')}
            inputValue={(alarms.courseAlarmOffset ?? 15).toString()}
            onInputValueChange={v =>
              parseInt(v, 10) &&
              dispatch(
                setSetting('alarms', {
                  ...alarms,
                  courseAlarmOffset: parseInt(v, 10) || 15,
                }),
              )
            }
            type="input"
          />
        )}
        <Caption style={styles.caption}>
          {getLocale().startsWith('zh')
            ? `手动同步${
                graduate ? '研究生' : '本科生'
              }课表到日历；请在更改提醒设置后重新同步以应用更改。`
            : `Manually sync ${
                graduate ? 'graduate' : 'undergraduate'
              } course schedule to your calendar. Please re-sync after any alarm setting change.`}
        </Caption>
        <TableCell
          style={styles.marginTop}
          iconName="event-note"
          primaryText={t('assignmentAutoSync')}
          switchValue={assignmentSync}
          onSwitchValueChange={handleAssignmentSync}
          type="switch"
          loading={assignmentSyncing}
        />
        <TableCell
          iconName="access-alarm"
          primaryText={t('assignmentAlarm')}
          switchValue={alarms.assignmentAlarm}
          onSwitchValueChange={value =>
            dispatch(setSetting('alarms', {...alarms, assignmentAlarm: value}))
          }
          type="switch"
          switchDisabled={!assignmentSync}
        />
        {alarms.assignmentAlarm && (
          <TableCell
            primaryText={t('assignmentAlarmOffset')}
            inputValue={(alarms.assignmentAlarmOffset ?? 24 * 60).toString()}
            onInputValueChange={v =>
              parseInt(v, 10) &&
              dispatch(
                setSetting('alarms', {
                  ...alarms,
                  assignmentAlarmOffset: parseInt(v, 10) || 24 * 60,
                }),
              )
            }
            type="input"
          />
        )}
        {Platform.OS === 'ios' ? (
          <TableCell
            iconName="event-available"
            primaryText={t('syncAssignmentsToCalendar')}
            switchValue={syncAssignmentsToCalendar}
            onSwitchValueChange={handleSyncTargetChange}
            type="switch"
          />
        ) : null}
        <Caption style={styles.caption}>
          {getLocale().startsWith('zh')
            ? `${
                Platform.OS === 'ios' && !syncAssignmentsToCalendar
                  ? '启用后，每次刷新时，作业会自动同步到“提醒事项”；'
                  : '启用后，每次刷新时，作业会自动同步到“日历”；'
              }已屏蔽课程的作业或已归档、已过期的作业不会被同步；请在更改提醒或同步设置后刷新作业以应用更改。`
            : `${
                Platform.OS === 'ios' && !syncAssignmentsToCalendar
                  ? 'If enabled, assignments will be synced to Reminders every time after refreshing. '
                  : 'If enabled, assignments will be synced to Calendar every time after refreshing. '
              }Assignments that are hidden, archived or have passed the due date will not be synced. Please refresh assignments after any alarm or sync setting changes.`}
        </Caption>
        <TableCell
          style={styles.marginTop}
          iconName="event-busy"
          primaryText={t('deleteSyncedCalendarsAndReminders')}
          type="none"
          onPress={handleCalendarDelete}
        />
      </ScrollView>
      <DatePickerModal
        locale={getLocale().startsWith('zh') ? 'zh' : 'en'}
        mode="range"
        visible={datePickerOpen}
        saveLabelDisabled={!startDate || !endDate}
        startLabel={t('datePickerStartLabel')}
        endLabel={t('datePickerEndLabel')}
        label={t('datePickerLabel')}
        onDismiss={handleDatePickerDismiss}
        startDate={startDate}
        endDate={endDate}
        onChange={handleSyncRangeChange}
        onConfirm={handleSyncRangeConfirm}
      />
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  marginTop: {
    marginTop: 32,
  },
  scrollViewPaddings: {
    paddingVertical: 32,
  },
  caption: {
    marginTop: 8,
    marginHorizontal: 16,
  },
});

export default CalendarEvent;
