import dayjs from 'dayjs';
import { Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateRangePicker from 'components/DateRangePicker';
import {
  Form,
  FormButton,
  FormNumberField,
  FormScreen,
  FormSection,
  FormToggle,
} from 'components/Form';
import { SyncKind, useCalendarSyncStore } from 'data/calendarSync';
import { setSetting, useSettings } from 'data/settings';
import { AlarmSettings } from 'data/types/state';
import { calendarDefaults } from 'helpers/calendar/details';
import { t } from 'helpers/i18n';
import { openSystemSettings } from 'helpers/systemSettings';
import {
  confirmDeleteCalendars,
  useAssignmentSync,
  useCalendarExport,
  useCourseScheduleSync,
} from 'hooks/useCalendarSync';
import useCalendarAccess, { CalendarAccess } from 'hooks/useCalendarAccess';
import { SettingsStackParams } from 'navigation/types';

type Props = NativeStackScreenProps<SettingsStackParams, 'CalendarSettings'>;

const CalendarSettings: React.FC<Props> = () => {
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

  const lastSynced = useCalendarSyncStore(state => state.lastSynced);
  /**
   * A section's footer: its caption, then when its sync last finished (only
   * while it's on).
   */
  const footer = (caption: string | undefined, kind?: SyncKind) => {
    const time = kind && lastSynced?.[kind];
    return (
      [
        caption,
        time &&
          t('lastSynced', {
            time: dayjs(time).format(t('shortDateTimeFormat')),
          }),
      ]
        .filter(Boolean)
        // One line apart, not a paragraph: a blank line before it would leave
        // the time nearer the next section's title than its own caption.
        .join('\n') || undefined
    );
  };

  const assignmentSyncFooter = t('assignmentSyncDescription');

  // A sync that's on but can't write is said first, with a way to fix it:
  // asking while the system still lets the app, else its settings.
  const access = useCalendarAccess();
  const blocked = (on: boolean, state: CalendarAccess | null) =>
    on && state !== null && state !== 'granted';
  const calendarBlocked = blocked(assignmentCalendarSync, access.calendar);
  const remindersBlocked =
    Platform.OS === 'ios' && blocked(assignmentReminderSync, access.reminders);
  const allow = (type: 'calendar' | 'reminder', state: CalendarAccess | null) =>
    state === 'denied' ? openSystemSettings('security') : access.request(type);

  return (
    <FormScreen>
      <Form>
        {(calendarBlocked || remindersBlocked) && (
          <FormSection
            footer={
              calendarBlocked && remindersBlocked
                ? t('calendarAndRemindersOffCaption')
                : calendarBlocked
                  ? t('calendarOffCaption')
                  : t('remindersOffCaption')
            }
          >
            {calendarBlocked && (
              <FormButton
                testID="calendar-allow-access"
                icon="calendarOff"
                title={t('allowCalendarAccess')}
                onPress={() => allow('calendar', access.calendar)}
              />
            )}
            {remindersBlocked && (
              <FormButton
                testID="reminders-allow-access"
                icon="reminders"
                title={t('allowRemindersAccess')}
                onPress={() => allow('reminder', access.reminders)}
              />
            )}
          </FormSection>
        )}
        <FormSection
          title={t('schedule')}
          footer={footer(
            t('courseScheduleSyncCaption', {
              type: graduate
                ? t('graduateSchedule')
                : t('undergraduateSchedule'),
            }),
            'courseSchedule',
          )}
        >
          <FormToggle
            icon="graduate"
            title={t('graduate')}
            value={graduate}
            onValueChange={value => setSetting('graduate', value)}
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
          {/* Last: it writes the schedule with the settings above. */}
          <FormButton
            icon="calendar"
            title={t('syncCourseSchedule')}
            onPress={picker.openPicker}
            loading={courseSyncing}
          />
        </FormSection>
        <FormSection
          title={t('setupCalendarSection')}
          footer={footer(
            Platform.OS === 'ios' ? undefined : assignmentSyncFooter,
            assignmentCalendarSync ? 'calendar' : undefined,
          )}
        >
          <FormToggle
            icon="assignmentCalendar"
            title={t('setupCalendar')}
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
          <FormSection
            title={t('remindersSection')}
            footer={footer(
              assignmentSyncFooter,
              assignmentReminderSync ? 'reminder' : undefined,
            )}
          >
            <FormToggle
              icon="reminders"
              title={t('setupReminders')}
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
        <FormSection
          title={t('syncedEventsSection')}
          footer={t('exportSyncedCalendarsDescription')}
        >
          <FormButton
            icon="export"
            title={t('exportSyncedCalendars')}
            onPress={exportToICS}
            loading={exporting}
          />
        </FormSection>
        <FormSection
          footer={
            Platform.OS === 'ios'
              ? t('calendarAndReminderAccessCaption')
              : t('calendarAccessCaption')
          }
        >
          <FormButton
            icon="settings"
            title={t('openSystemSettings')}
            onPress={() => openSystemSettings('security')}
          />
        </FormSection>
        {/* Last and on its own, as Apple's settings end with what deletes. */}
        <FormSection>
          <FormButton
            destructive
            icon="delete"
            title={
              Platform.OS === 'ios'
                ? t('deleteSyncedCalendarsAndReminders')
                : t('deleteSyncedCalendars')
            }
            onPress={confirmDeleteCalendars}
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
    </FormScreen>
  );
};

export default CalendarSettings;
