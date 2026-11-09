import { Linking, Platform } from 'react-native';
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
import { t } from 'helpers/i18n';
import {
  confirmDeleteCalendars,
  useAssignmentSync,
  useCalendarExport,
  useCourseScheduleSync,
} from 'hooks/useCalendarSync';
import { SettingsStackParams } from './types';
import DeviceInfo from 'constants/DeviceInfo';

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
            icon={{ ios: 'person.2', android: 'account-multiple' }}
            title={t('graduate')}
            value={graduate}
            onValueChange={value => setSetting('graduate', value)}
          />
          <FormButton
            icon={{ ios: 'calendar', android: 'calendar' }}
            title={t('syncCourseSchedule')}
            onPress={picker.openPicker}
            loading={courseSyncing}
          />
          <FormToggle
            icon={{ ios: 'alarm', android: 'alarm' }}
            title={t('classAlarm')}
            value={alarms.courseAlarm}
            onValueChange={value => setAlarm('courseAlarm', value)}
          />
          {alarms.courseAlarm && (
            <FormNumberField
              title={t('classAlarmBefore')}
              value={alarms.courseAlarmOffset ?? 15}
              onValueChange={value => setAlarm('courseAlarmOffset', value)}
            />
          )}
          <FormToggle
            icon={{ ios: 'mappin.slash', android: 'map-marker-off' }}
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
            icon={{ ios: 'calendar.badge.clock', android: 'calendar-text' }}
            title={t('assignmentCalendarSync')}
            value={assignmentCalendarSync}
            onValueChange={enabled => handleAssignmentSync('calendar', enabled)}
            loading={assignmentCalendarSyncing}
          />
          {assignmentCalendarSync && (
            <FormNumberField
              title={t('calendarEventLength')}
              value={calendarEventLength ?? 30}
              onValueChange={value => setSetting('calendarEventLength', value)}
            />
          )}
          <FormToggle
            icon={{ ios: 'alarm', android: 'alarm' }}
            title={t('assignmentCalendarAlarm')}
            value={alarms.assignmentCalendarAlarm}
            onValueChange={value => setAlarm('assignmentCalendarAlarm', value)}
            disabled={!assignmentCalendarSync}
          />
          {alarms.assignmentCalendarAlarm && (
            <FormNumberField
              title={t('assignmentCalendarAlarmOffset')}
              value={alarms.assignmentCalendarAlarmOffset ?? 24 * 60}
              onValueChange={value =>
                setAlarm('assignmentCalendarAlarmOffset', value)
              }
            />
          )}
          {alarms.assignmentCalendarAlarm && (
            <FormToggle
              icon={{ ios: 'alarm', android: 'alarm' }}
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
                value={alarms.assignmentCalendarSecondAlarmOffset ?? 30}
                onValueChange={value =>
                  setAlarm('assignmentCalendarSecondAlarmOffset', value)
                }
              />
            )}
          {alarms.assignmentCalendarAlarm && (
            <FormToggle
              icon={{
                ios: 'checkmark.circle',
                android: 'check-circle-outline',
              }}
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
              icon={{ ios: 'checklist', android: 'calendar-check' }}
              title={t('assignmentReminderSync')}
              value={assignmentReminderSync}
              onValueChange={enabled =>
                handleAssignmentSync('reminder', enabled)
              }
              loading={assignmentReminderSyncing}
            />
            <FormToggle
              icon={{ ios: 'alarm', android: 'alarm' }}
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
                value={alarms.assignmentReminderAlarmOffset ?? 24 * 60}
                onValueChange={value =>
                  setAlarm('assignmentReminderAlarmOffset', value)
                }
              />
            )}
          </FormSection>
        )}
        <FormSection footer={t('exportSyncedCalendarsDescription')}>
          <FormButton
            icon={{ ios: 'square.and.arrow.up', android: 'export-variant' }}
            title={t('exportSyncedCalendars')}
            onPress={exportToICS}
            loading={exporting}
          />
        </FormSection>
        <FormSection>
          <FormButton
            icon={{ ios: 'trash', android: 'calendar-remove' }}
            title={t('deleteSyncedCalendarsAndReminders')}
            destructive
            onPress={confirmDeleteCalendars}
          />
          <FormButton
            icon={{ ios: 'gear', android: 'cog' }}
            title={t('configureCalendarAndReminder')}
            onPress={() =>
              DeviceInfo.isMac()
                ? Linking.openURL(
                    'x-apple.systempreferences:com.apple.preference.security',
                  )
                : Linking.openSettings()
            }
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
