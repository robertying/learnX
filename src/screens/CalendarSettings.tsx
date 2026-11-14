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
import { showsBeijingTime } from 'helpers/serverTime';
import { useMinute } from 'hooks/useClock';
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

  const courseCalendarSync = useSettings(
    settings => settings.courseCalendarSync,
  );
  const {
    syncing: courseSyncing,
    enabling: courseSyncEnabling,
    setSyncEnabled: handleCourseSync,
    picker,
  } = useCourseScheduleSync();
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
  const now = useMinute();
  /**
   * The footer of a sync that's on: its captions, one per line, then when it
   * last finished.
   */
  const footer = (captions: (string | false)[], kind: SyncKind) => {
    const time = lastSynced?.[kind];
    return (
      [
        ...captions,
        time &&
          t('lastSynced', {
            time: dayjs(time).format(t('shortDateTimeFormat')),
          }),
      ]
        .filter(Boolean)
        // One line apart, not a paragraph: a blank line before the time would
        // leave it nearer the next section's title than its own caption.
        .join('\n')
    );
  };
  const scheduleType = graduate
    ? t('graduateSchedule')
    : t('undergraduateSchedule');
  const awayFromBeijing = !showsBeijingTime(now);

  // A sync that's on but can't write is said first, with a way to fix it:
  // asking while the system still lets the app, else its settings.
  const access = useCalendarAccess();
  const blocked = (on: boolean, state: CalendarAccess | null) =>
    on && state !== null && state !== 'granted';
  const calendarBlocked = blocked(
    assignmentCalendarSync || courseCalendarSync,
    access.calendar,
  );
  const remindersBlocked =
    Platform.OS === 'ios' && blocked(assignmentReminderSync, access.reminders);
  const allow = (type: 'calendar' | 'reminder', state: CalendarAccess | null) =>
    state === 'denied' ? openSystemSettings('security') : access.request(type);

  return (
    <FormScreen>
      <Form testID="calendar-settings">
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
          footer={
            courseCalendarSync
              ? footer(
                  [
                    t('courseScheduleSyncOnCaption', { type: scheduleType }),
                    // Picked days are Beijing days, as the timetable's.
                    awayFromBeijing && t('syncDatesBeijingCaption'),
                  ],
                  'courseSchedule',
                )
              : t('courseScheduleSyncOffCaption', { type: scheduleType })
          }
        >
          <FormToggle
            icon="calendar"
            title={t('setupCourseCalendar')}
            value={courseCalendarSync}
            testID="calendar-course-sync"
            onValueChange={handleCourseSync}
            loading={courseSyncEnabling}
          />
          {courseCalendarSync && (
            <FormToggle
              icon="reminder"
              testID="calendar-classAlarm"
              title={t('classAlarm')}
              value={alarms.courseAlarm}
              onValueChange={value => setAlarm('courseAlarm', value)}
            />
          )}
          {courseCalendarSync && alarms.courseAlarm && (
            <FormNumberField
              title={t('classAlarmBefore')}
              value={
                alarms.courseAlarmOffset ?? calendarDefaults.courseAlarmOffset
              }
              onValueChange={value => setAlarm('courseAlarmOffset', value)}
            />
          )}
          {courseCalendarSync && (
            <FormToggle
              icon="noLocation"
              testID="calendar-courseEventOmitLocation"
              title={t('courseEventOmitLocation')}
              value={courseEventOmitLocation}
              onValueChange={value =>
                setSetting('courseEventOmitLocation', value)
              }
            />
          )}
          {/* Last: it writes the schedule with the settings above. */}
          {courseCalendarSync && (
            <FormButton
              icon="sync"
              title={t('syncCourseSchedule')}
              onPress={picker.openPicker}
              loading={courseSyncing}
            />
          )}
        </FormSection>
        {/* Each sync's switch heads its own section, its options below it, as
            the schedule's does. */}
        <FormSection
          title={
            Platform.OS === 'ios'
              ? t('assignmentsInCalendarSection')
              : t('assignments')
          }
          footer={
            assignmentCalendarSync
              ? footer([t('assignmentSyncDescription')], 'calendar')
              : t('assignmentCalendarSyncOffCaption')
          }
        >
          <FormToggle
            icon="assignmentCalendar"
            testID="calendar-assignment-sync"
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
          {assignmentCalendarSync && (
            <FormToggle
              icon="reminder"
              testID="calendar-assignmentCalendarAlarm"
              title={t('assignmentCalendarAlarm')}
              value={alarms.assignmentCalendarAlarm}
              onValueChange={value =>
                setAlarm('assignmentCalendarAlarm', value)
              }
            />
          )}
          {assignmentCalendarSync && alarms.assignmentCalendarAlarm && (
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
          {assignmentCalendarSync && alarms.assignmentCalendarAlarm && (
            <FormToggle
              icon="reminder"
              testID="calendar-assignmentCalendarSecondAlarm"
              title={t('assignmentCalendarSecondAlarm')}
              value={alarms.assignmentCalendarSecondAlarm}
              onValueChange={value =>
                setAlarm('assignmentCalendarSecondAlarm', value)
              }
            />
          )}
          {assignmentCalendarSync &&
            alarms.assignmentCalendarAlarm &&
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
          {assignmentCalendarSync && alarms.assignmentCalendarAlarm && (
            <FormToggle
              icon="done"
              testID="calendar-assignmentCalendarNoAlarmIfComplete"
              title={t('assignmentCalendarNoAlarmIfComplete')}
              value={alarms.assignmentCalendarNoAlarmIfComplete}
              onValueChange={value =>
                setAlarm('assignmentCalendarNoAlarmIfComplete', value)
              }
            />
          )}
        </FormSection>
        {Platform.OS === 'ios' && (
          <FormSection
            title={t('assignmentsInRemindersSection')}
            footer={
              assignmentReminderSync
                ? footer(
                    [
                      t('assignmentSyncDescription'),
                      alarms.assignmentReminderAlarm &&
                        t('assignmentReminderAlarmCaption'),
                    ],
                    'reminder',
                  )
                : t('assignmentReminderSyncOffCaption')
            }
          >
            <FormToggle
              icon="reminders"
              testID="reminders-assignment-sync"
              title={t('setupReminders')}
              value={assignmentReminderSync}
              onValueChange={enabled =>
                handleAssignmentSync('reminder', enabled)
              }
              loading={assignmentReminderSyncing}
            />
            {assignmentReminderSync && (
              <FormToggle
                icon="reminder"
                testID="calendar-assignmentReminderAlarm"
                title={t('assignmentReminderAlarm')}
                value={alarms.assignmentReminderAlarm}
                onValueChange={value =>
                  setAlarm('assignmentReminderAlarm', value)
                }
              />
            )}
            {assignmentReminderSync && alarms.assignmentReminderAlarm && (
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
        {/* Not red: the confirmation that follows is. */}
        <FormSection>
          <FormButton
            testID="calendar-delete"
            icon="delete"
            title={
              Platform.OS === 'ios'
                ? t('deleteSyncedCalendarsAndRemindersEllipsis')
                : t('deleteSyncedCalendarsEllipsis')
            }
            onPress={confirmDeleteCalendars}
          />
        </FormSection>
      </Form>
      <DateRangePicker
        visible={picker.open}
        title={
          // As Today's classes: a phone elsewhere says the days are Beijing's.
          awayFromBeijing
            ? `${t('datePickerLabel')} · ${t('beijingTime')}`
            : t('datePickerLabel')
        }
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
