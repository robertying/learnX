import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Caption } from 'react-native-paper';
import { DatePickerModal } from 'react-native-paper-dates';
import type {
  CalendarDate,
  RangeChange,
} from 'react-native-paper-dates/lib/typescript/Date/Calendar';
import dayjs from 'dayjs';
import TableCell from 'components/TableCell';
import SafeArea from 'components/SafeArea';
import ScrollView from 'components/ScrollView';
import Styles from 'constants/Styles';
import { useAppSelector } from 'data/store';
import { setSetting, useSettings } from 'data/settings';
import { useUserData } from 'data/userData';
import { dataSource, loginWithFingerPrint } from 'data/source';
import {
  exportSyncedCalendarsToICS,
  removeCalendars,
  saveAssignmentsToReminderOrCalendar,
  saveCoursesToCalendar,
} from 'helpers/event';
import { exportTextFile } from 'helpers/fs';
import { isLocaleChinese, t } from 'helpers/i18n';
import useToast from 'hooks/useToast';
import useFilteredData from 'hooks/useFilteredData';
import { SettingsStackParams } from './types';
import DeviceInfo from 'constants/DeviceInfo';

type Props = NativeStackScreenProps<SettingsStackParams, 'CalendarEvent'>;

const CalendarEvent: React.FC<Props> = () => {
  const toast = useToast();

  const assignmentCalendarSync = useSettings(
    settings => settings.assignmentCalendarSync,
  );
  const assignmentReminderSync = useSettings(
    settings => settings.assignmentReminderSync,
  );
  const alarms = useSettings(settings => settings.alarms);
  const graduate = useSettings(settings => settings.graduate);
  const hiddenCourseIds = useUserData(data => data.hiddenCourses);
  const favoriteIds = useUserData(data => data.favorites.assignment);
  const archivedIds = useUserData(data => data.archived.assignment);
  const assignmentState = useAppSelector(state => state.assignments);
  const calendarEventLength = useSettings(
    settings => settings.calendarEventLength,
  );
  const courseEventOmitLocation = useSettings(
    settings => settings.courseEventOmitLocation,
  );

  const { all } = useFilteredData({
    data: assignmentState.items,
    fav: favoriteIds,
    archived: archivedIds,
    hidden: hiddenCourseIds,
  });

  const sync = useMemo(
    () => all.filter(assignment => dayjs(assignment.deadline).isAfter(dayjs())),
    [all],
  );

  const [courseSyncing, setCourseSyncing] = useState(false);
  const [assignmentCalendarSyncing, setAssignmentCalendarSyncing] =
    useState(false);
  const [assignmentReminderSyncing, setAssignmentReminderSyncing] =
    useState(false);
  const [exporting, setExporting] = useState(false);
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

  const handleSyncRangeChange: RangeChange = range => {
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  const handleSyncRangeConfirm: RangeChange = range => {
    handleDatePickerDismiss();
    syncCourse(range.startDate, range.endDate);
  };

  const syncCourse = async (start?: Date, end?: Date) => {
    if (!start || !end) {
      return;
    }

    setCourseSyncing(true);

    const startDay = dayjs(start);
    const endDay = dayjs(end);

    try {
      await loginWithFingerPrint();

      const events = await dataSource.getCalendar(
        startDay.format('YYYYMMDD'),
        endDay.format('YYYYMMDD'),
        graduate,
      );

      if (events.length === 0) {
        toast(t('courseScheduleSyncNoCourse'), 'warning');
      } else {
        await saveCoursesToCalendar(events, startDay, endDay);
        toast(t('courseScheduleSyncSucceeded'), 'success');
      }
    } catch (err) {
      if ((err as Error).message === 'Missing calendar permission') {
        toast(t('courseScheduleSyncNoCalendarPermission'), 'error');
      } else if ((err as Error).message === 'Missing reminder permission') {
        toast(t('courseScheduleSyncNoReminderPermission'), 'error');
      } else {
        toast(t('courseScheduleSyncRepetitiveError'), 'error');
      }
    }
    setCourseSyncing(false);
  };

  const handleAssignmentSync = async (
    type: 'calendar' | 'reminder',
    enabled: boolean,
  ) => {
    if (enabled) {
      if (type === 'calendar') {
        setAssignmentCalendarSyncing(true);
      } else {
        setAssignmentReminderSyncing(true);
      }

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
      if (type === 'calendar') {
        setAssignmentCalendarSyncing(false);
      } else {
        setAssignmentReminderSyncing(false);
      }
    }

    if (type === 'calendar') {
      setSetting('assignmentCalendarSync', enabled);
    } else {
      setSetting('assignmentReminderSync', enabled);
    }
  };

  const handleCalendarExport = async () => {
    setExporting(true);

    try {
      const ics = await exportSyncedCalendarsToICS();
      await exportTextFile('learnX.ics', ics, 'text/calendar');
      if (DeviceInfo.isMac()) {
        toast(t('calendarExportSavedToDownloads'), 'success');
      }
    } catch (err) {
      if ((err as Error).message === 'Missing calendar permission') {
        toast(t('calendarExportNoCalendarPermission'), 'error');
      } else if ((err as Error).message === 'No synced events') {
        toast(t('calendarExportNoEvent'), 'warning');
      } else {
        toast(t('calendarExportFailed') + (err as Error).message, 'error');
      }
    }
    setExporting(false);
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
      { cancelable: true },
    );
  };

  return (
    <SafeArea>
      <KeyboardAvoidingView
        style={Styles.flex1}
        behavior="padding"
        keyboardVerticalOffset={120}
      >
        <ScrollView contentContainerStyle={styles.scrollViewPaddings}>
          <TableCell
            iconName="people"
            primaryText={t('graduate')}
            switchValue={graduate}
            onSwitchValueChange={value => setSetting('graduate', value)}
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
              setSetting('alarms', { ...alarms, courseAlarm: value })
            }
            type="switch"
          />
          {alarms.courseAlarm && (
            <TableCell
              primaryText={t('classAlarmBefore')}
              inputValue={(alarms.courseAlarmOffset ?? 15).toString()}
              onInputValueChange={v =>
                parseInt(v, 10) &&
                setSetting('alarms', {
                  ...alarms,
                  courseAlarmOffset: parseInt(v, 10) || 15,
                })
              }
              type="input"
            />
          )}
          <TableCell
            iconName="location-off"
            primaryText={t('courseEventOmitLocation')}
            switchValue={courseEventOmitLocation}
            onSwitchValueChange={value =>
              setSetting('courseEventOmitLocation', value)
            }
            type="switch"
          />
          <Caption style={styles.caption}>
            {isLocaleChinese()
              ? `手动同步${
                  graduate ? '研究生' : '本科生'
                }课表到日历；请在更改设置后重新同步以应用更改。`
              : `Manually sync ${
                  graduate ? 'graduate' : 'undergraduate'
                } course schedule to your calendar. Please re-sync after any setting change.`}
          </Caption>
          <TableCell
            style={styles.marginTop}
            iconName="event-note"
            primaryText={t('assignmentCalendarSync')}
            switchValue={assignmentCalendarSync}
            onSwitchValueChange={enabled =>
              handleAssignmentSync('calendar', enabled)
            }
            type="switch"
            loading={assignmentCalendarSyncing}
          />
          {assignmentCalendarSync && (
            <TableCell
              primaryText={t('calendarEventLength')}
              inputValue={(calendarEventLength ?? 30).toString()}
              onInputValueChange={v =>
                parseInt(v, 10) &&
                setSetting('calendarEventLength', parseInt(v, 10) || 30)
              }
              type="input"
            />
          )}
          <TableCell
            iconName="access-alarm"
            primaryText={t('assignmentCalendarAlarm')}
            switchValue={alarms.assignmentCalendarAlarm}
            onSwitchValueChange={value =>
              setSetting('alarms', {
                ...alarms,
                assignmentCalendarAlarm: value,
              })
            }
            type="switch"
            switchDisabled={!assignmentCalendarSync}
          />
          {alarms.assignmentCalendarAlarm && (
            <TableCell
              primaryText={t('assignmentCalendarAlarmOffset')}
              inputValue={(
                alarms.assignmentCalendarAlarmOffset ?? 24 * 60
              ).toString()}
              onInputValueChange={v =>
                parseInt(v, 10) &&
                setSetting('alarms', {
                  ...alarms,
                  assignmentCalendarAlarmOffset: parseInt(v, 10) || 24 * 60,
                })
              }
              type="input"
            />
          )}
          {alarms.assignmentCalendarAlarm && (
            <TableCell
              iconName="access-alarm"
              primaryText={t('assignmentCalendarSecondAlarm')}
              switchValue={alarms.assignmentCalendarSecondAlarm}
              onSwitchValueChange={value =>
                setSetting('alarms', {
                  ...alarms,
                  assignmentCalendarSecondAlarm: value,
                })
              }
              type="switch"
              switchDisabled={!assignmentCalendarSync}
            />
          )}
          {alarms.assignmentCalendarAlarm &&
            alarms.assignmentCalendarSecondAlarm && (
              <TableCell
                primaryText={t('assignmentCalendarSecondAlarmOffset')}
                inputValue={(
                  alarms.assignmentCalendarSecondAlarmOffset ?? 30
                ).toString()}
                onInputValueChange={v =>
                  parseInt(v, 10) &&
                  setSetting('alarms', {
                    ...alarms,
                    assignmentCalendarSecondAlarmOffset: parseInt(v, 10) || 30,
                  })
                }
                type="input"
              />
            )}
          {alarms.assignmentCalendarAlarm && (
            <TableCell
              iconName="check-circle-outline"
              primaryText={t('assignmentCalendarNoAlarmIfComplete')}
              switchValue={alarms.assignmentCalendarNoAlarmIfComplete}
              onSwitchValueChange={value =>
                setSetting('alarms', {
                  ...alarms,
                  assignmentCalendarNoAlarmIfComplete: value,
                })
              }
              type="switch"
              switchDisabled={!assignmentCalendarSync}
            />
          )}
          {Platform.OS === 'ios' ? (
            <>
              <TableCell
                style={{ marginTop: 16 }}
                iconName="event-available"
                primaryText={t('assignmentReminderSync')}
                switchValue={assignmentReminderSync}
                onSwitchValueChange={enabled =>
                  handleAssignmentSync('reminder', enabled)
                }
                type="switch"
                loading={assignmentReminderSyncing}
              />
              <TableCell
                iconName="access-alarm"
                primaryText={t('assignmentReminderAlarm')}
                switchValue={alarms.assignmentReminderAlarm}
                onSwitchValueChange={value =>
                  setSetting('alarms', {
                    ...alarms,
                    assignmentReminderAlarm: value,
                  })
                }
                type="switch"
                switchDisabled={!assignmentReminderSync}
              />
              {alarms.assignmentReminderAlarm && (
                <TableCell
                  primaryText={t('assignmentReminderAlarmOffset')}
                  inputValue={(
                    alarms.assignmentReminderAlarmOffset ?? 24 * 60
                  ).toString()}
                  onInputValueChange={v =>
                    parseInt(v, 10) &&
                    setSetting('alarms', {
                      ...alarms,
                      assignmentReminderAlarmOffset: parseInt(v, 10) || 24 * 60,
                    })
                  }
                  type="input"
                />
              )}
            </>
          ) : null}
          <Caption style={styles.caption}>
            {t('assignmentSyncDescription')}
          </Caption>
          <TableCell
            style={styles.marginTop}
            iconName="ios-share"
            primaryText={t('exportSyncedCalendars')}
            type="none"
            onPress={handleCalendarExport}
            loading={exporting}
          />
          <Caption style={styles.caption}>
            {t('exportSyncedCalendarsDescription')}
          </Caption>
          <TableCell
            style={styles.marginTop}
            iconName="event-busy"
            primaryText={t('deleteSyncedCalendarsAndReminders')}
            type="none"
            onPress={handleCalendarDelete}
          />
          <TableCell
            iconName="settings"
            primaryText={t('configureCalendarAndReminder')}
            type="none"
            onPress={() =>
              DeviceInfo.isMac()
                ? Linking.openURL(
                    'x-apple.systempreferences:com.apple.preference.security',
                  )
                : Linking.openSettings()
            }
          />
        </ScrollView>
      </KeyboardAvoidingView>
      <DatePickerModal
        locale={isLocaleChinese() ? 'zh' : 'en'}
        mode="range"
        visible={datePickerOpen}
        saveLabelDisabled={!startDate || !endDate}
        startLabel={t('datePickerStartLabel')}
        endLabel={t('datePickerEndLabel')}
        saveLabel={t('datePickerSaveLabel')}
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
