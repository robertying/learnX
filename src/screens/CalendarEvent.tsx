import { Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateRangePicker from 'components/DateRangePicker';
import {
  Form,
  FormButton,
  FormNumberField,
  FormSection,
  FormToggle,
} from 'components/Form';
import SafeArea from 'components/SafeArea';
import { setSetting, useSettings } from 'data/settings';
import { AlarmSettings } from 'data/types/state';
import { calendarDefaults } from 'helpers/eventDetails';
import { t } from 'helpers/i18n';
import { openSystemSettings } from 'helpers/systemSettings';
import {
  confirmDeleteCalendars,
  useAssignmentSync,
  useCalendarExport,
  useCourseScheduleSync,
} from 'hooks/useCalendarSync';
import { SettingsStackParams } from './types';

type Props = NativeStackScreenProps<SettingsStackParams, 'CalendarEvent'>;

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

  const assignmentSyncFooter = t('assignmentSyncDescription');

  return (
    <SafeArea>
      <Form>
        <FormSection
          footer={t('courseScheduleSyncCaption', {
            type: graduate ? t('graduateSchedule') : t('undergraduateSchedule'),
          })}
        >
          <FormToggle
            icon="graduate"
            title={t('graduate')}
            value={graduate}
            onValueChange={value => setSetting('graduate', value)}
          />
          <FormButton
            icon="calendar"
            title={t('syncCourseSchedule')}
            onPress={picker.openPicker}
            loading={courseSyncing}
          />
          <FormToggle
            icon="reminder"
            title={t('classAlarm')}
            value={alarms.courseAlarm}
            onValueChange={value => setAlarm('courseAlarm', value)}
          />
          {alarms.courseAlarm && (
            <FormNumberField
              title={t('classAlarmBefore')}
              value={
                alarms.courseAlarmOffset ?? calendarDefaults.courseAlarmOffset
              }
              onValueChange={value => setAlarm('courseAlarmOffset', value)}
            />
          )}
          <FormToggle
            icon="noLocation"
            title={t('courseEventOmitLocation')}
            value={courseEventOmitLocation}
            onValueChange={value =>
              setSetting('courseEventOmitLocation', value)
            }
          />
        </FormSection>
        <FormSection
          footer={Platform.OS === 'ios' ? undefined : assignmentSyncFooter}
        >
          <FormToggle
            icon="assignmentCalendar"
            title={t('assignmentCalendarSync')}
            value={assignmentCalendarSync}
            onValueChange={enabled => handleAssignmentSync('calendar', enabled)}
            loading={assignmentCalendarSyncing}
          />
          {assignmentCalendarSync && (
            <FormNumberField
              title={t('calendarEventLength')}
              value={
                calendarEventLength ?? calendarDefaults.calendarEventLength
              }
              onValueChange={value => setSetting('calendarEventLength', value)}
            />
          )}
          <FormToggle
            icon="reminder"
            title={t('assignmentCalendarAlarm')}
            value={alarms.assignmentCalendarAlarm}
            onValueChange={value => setAlarm('assignmentCalendarAlarm', value)}
            disabled={!assignmentCalendarSync}
          />
          {alarms.assignmentCalendarAlarm && (
            <FormNumberField
              title={t('assignmentCalendarAlarmOffset')}
              value={
                alarms.assignmentCalendarAlarmOffset ??
                calendarDefaults.assignmentCalendarAlarmOffset
              }
              onValueChange={value =>
                setAlarm('assignmentCalendarAlarmOffset', value)
              }
            />
          )}
          {alarms.assignmentCalendarAlarm && (
            <FormToggle
              icon="reminder"
              title={t('assignmentCalendarSecondAlarm')}
              value={alarms.assignmentCalendarSecondAlarm}
              onValueChange={value =>
                setAlarm('assignmentCalendarSecondAlarm', value)
              }
              disabled={!assignmentCalendarSync}
            />
          )}
          {alarms.assignmentCalendarAlarm &&
            alarms.assignmentCalendarSecondAlarm && (
              <FormNumberField
                title={t('assignmentCalendarSecondAlarmOffset')}
                value={
                  alarms.assignmentCalendarSecondAlarmOffset ??
                  calendarDefaults.assignmentCalendarSecondAlarmOffset
                }
                onValueChange={value =>
                  setAlarm('assignmentCalendarSecondAlarmOffset', value)
                }
              />
            )}
          {alarms.assignmentCalendarAlarm && (
            <FormToggle
              icon="done"
              title={t('assignmentCalendarNoAlarmIfComplete')}
              value={alarms.assignmentCalendarNoAlarmIfComplete}
              onValueChange={value =>
                setAlarm('assignmentCalendarNoAlarmIfComplete', value)
              }
              disabled={!assignmentCalendarSync}
            />
          )}
        </FormSection>
        {Platform.OS === 'ios' && (
          <FormSection footer={assignmentSyncFooter}>
            <FormToggle
              icon="reminders"
              title={t('assignmentReminderSync')}
              value={assignmentReminderSync}
              onValueChange={enabled =>
                handleAssignmentSync('reminder', enabled)
              }
              loading={assignmentReminderSyncing}
            />
            <FormToggle
              icon="reminder"
              title={t('assignmentReminderAlarm')}
              value={alarms.assignmentReminderAlarm}
              onValueChange={value =>
                setAlarm('assignmentReminderAlarm', value)
              }
              disabled={!assignmentReminderSync}
            />
            {alarms.assignmentReminderAlarm && (
              <FormNumberField
                title={t('assignmentReminderAlarmOffset')}
                value={
                  alarms.assignmentReminderAlarmOffset ??
                  calendarDefaults.assignmentReminderAlarmOffset
                }
                onValueChange={value =>
                  setAlarm('assignmentReminderAlarmOffset', value)
                }
              />
            )}
          </FormSection>
        )}
        <FormSection footer={t('exportSyncedCalendarsDescription')}>
          <FormButton
            icon="export"
            title={t('exportSyncedCalendars')}
            onPress={exportToICS}
            loading={exporting}
          />
        </FormSection>
        <FormSection>
          <FormButton
            icon="delete"
            title={t('deleteSyncedCalendarsAndReminders')}
            onPress={confirmDeleteCalendars}
          />
          <FormButton
            icon="settings"
            title={t('configureCalendarAndReminder')}
            onPress={() => openSystemSettings('security')}
          />
        </FormSection>
      </Form>
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
    </SafeArea>
  );
};

export default CalendarEvent;
