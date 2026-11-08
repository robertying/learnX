import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateRangePicker from 'components/DateRangePicker';
import TableCell from 'components/TableCell';
import SafeArea from 'components/SafeArea';
import WindowSafeArea from 'components/WindowSafeArea';
import ScrollView from 'components/ScrollView';
import Styles from 'constants/Styles';
import { setSetting, useSettings } from 'data/settings';
import { AlarmSettings } from 'data/types/state';
import { isLocaleChinese, t } from 'helpers/i18n';
import {
  confirmDeleteCalendars,
  useAssignmentSync,
  useCalendarExport,
  useCourseScheduleSync,
} from 'hooks/useCalendarSync';
import { SettingsStackParams } from './types';
import DeviceInfo from 'constants/DeviceInfo';
import { Caption } from 'components/Text';

type Props = NativeStackScreenProps<SettingsStackParams, 'CalendarEvent'>;

/** Input handler that applies positive whole numbers and ignores the rest */
const onNumberInput = (apply: (value: number) => void) => (v: string) => {
  const value = parseInt(v, 10);
  if (value) {
    apply(value);
  }
};

const CalendarEvent: React.FC<Props> = () => {
  const assignmentCalendarSync = useSettings(
    settings => settings.assignmentCalendarSync,
  );
  const assignmentReminderSync = useSettings(
    settings => settings.assignmentReminderSync,
  );
  const alarms = useSettings(settings => settings.alarms);
  const graduate = useSettings(settings => settings.graduate);
  const calendarEventLength = useSettings(
    settings => settings.calendarEventLength,
  );
  const courseEventOmitLocation = useSettings(
    settings => settings.courseEventOmitLocation,
  );

  const { syncing: courseSyncing, picker } = useCourseScheduleSync();
  const {
    calendarSyncing: assignmentCalendarSyncing,
    reminderSyncing: assignmentReminderSyncing,
    setSyncEnabled: handleAssignmentSync,
  } = useAssignmentSync();
  const { exporting, exportToICS } = useCalendarExport();

  const setAlarm = <K extends keyof AlarmSettings>(
    key: K,
    value: AlarmSettings[K],
  ) => setSetting('alarms', { ...alarms, [key]: value });

  return (
    <SafeArea>
      <KeyboardAvoidingView
        style={Styles.flex1}
        behavior="padding"
        keyboardVerticalOffset={120}
      >
        <ScrollView contentContainerStyle={styles.scrollViewPaddings}>
          <TableCell
            iconName="account-multiple"
            primaryText={t('graduate')}
            switchValue={graduate}
            onSwitchValueChange={value => setSetting('graduate', value)}
            type="switch"
          />
          <TableCell
            iconName="calendar"
            primaryText={t('syncCourseSchedule')}
            type="none"
            onPress={picker.openPicker}
            loading={courseSyncing}
          />
          <TableCell
            iconName="alarm"
            primaryText={t('classAlarm')}
            switchValue={alarms.courseAlarm}
            onSwitchValueChange={value => setAlarm('courseAlarm', value)}
            type="switch"
          />
          {alarms.courseAlarm && (
            <TableCell
              primaryText={t('classAlarmBefore')}
              inputValue={(alarms.courseAlarmOffset ?? 15).toString()}
              onInputValueChange={onNumberInput(value =>
                setAlarm('courseAlarmOffset', value),
              )}
              type="input"
            />
          )}
          <TableCell
            iconName="map-marker-off"
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
            iconName="calendar-text"
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
              onInputValueChange={onNumberInput(value =>
                setSetting('calendarEventLength', value),
              )}
              type="input"
            />
          )}
          <TableCell
            iconName="alarm"
            primaryText={t('assignmentCalendarAlarm')}
            switchValue={alarms.assignmentCalendarAlarm}
            onSwitchValueChange={value =>
              setAlarm('assignmentCalendarAlarm', value)
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
              onInputValueChange={onNumberInput(value =>
                setAlarm('assignmentCalendarAlarmOffset', value),
              )}
              type="input"
            />
          )}
          {alarms.assignmentCalendarAlarm && (
            <TableCell
              iconName="alarm"
              primaryText={t('assignmentCalendarSecondAlarm')}
              switchValue={alarms.assignmentCalendarSecondAlarm}
              onSwitchValueChange={value =>
                setAlarm('assignmentCalendarSecondAlarm', value)
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
                onInputValueChange={onNumberInput(value =>
                  setAlarm('assignmentCalendarSecondAlarmOffset', value),
                )}
                type="input"
              />
            )}
          {alarms.assignmentCalendarAlarm && (
            <TableCell
              iconName="check-circle-outline"
              primaryText={t('assignmentCalendarNoAlarmIfComplete')}
              switchValue={alarms.assignmentCalendarNoAlarmIfComplete}
              onSwitchValueChange={value =>
                setAlarm('assignmentCalendarNoAlarmIfComplete', value)
              }
              type="switch"
              switchDisabled={!assignmentCalendarSync}
            />
          )}
          {Platform.OS === 'ios' ? (
            <>
              <TableCell
                style={{ marginTop: 16 }}
                iconName="calendar-check"
                primaryText={t('assignmentReminderSync')}
                switchValue={assignmentReminderSync}
                onSwitchValueChange={enabled =>
                  handleAssignmentSync('reminder', enabled)
                }
                type="switch"
                loading={assignmentReminderSyncing}
              />
              <TableCell
                iconName="alarm"
                primaryText={t('assignmentReminderAlarm')}
                switchValue={alarms.assignmentReminderAlarm}
                onSwitchValueChange={value =>
                  setAlarm('assignmentReminderAlarm', value)
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
                  onInputValueChange={onNumberInput(value =>
                    setAlarm('assignmentReminderAlarmOffset', value),
                  )}
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
            iconName="export-variant"
            primaryText={t('exportSyncedCalendars')}
            type="none"
            onPress={exportToICS}
            loading={exporting}
          />
          <Caption style={styles.caption}>
            {t('exportSyncedCalendarsDescription')}
          </Caption>
          <TableCell
            style={styles.marginTop}
            iconName="calendar-remove"
            primaryText={t('deleteSyncedCalendarsAndReminders')}
            type="none"
            onPress={confirmDeleteCalendars}
          />
          <TableCell
            iconName="cog"
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
      {/* Opened from a split view column, but covers the whole window. */}
      <WindowSafeArea>
        <DateRangePicker
          visible={picker.open}
          title={t('datePickerLabel')}
          startLabel={t('datePickerStartLabel')}
          endLabel={t('datePickerEndLabel')}
          saveLabel={t('datePickerSaveLabel')}
          cancelLabel={t('cancel')}
          startDate={picker.startDate}
          endDate={picker.endDate}
          onDismiss={picker.closePicker}
          onConfirm={picker.onRangeConfirm}
        />
      </WindowSafeArea>
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
