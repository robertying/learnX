import { useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import ActionBar from 'components/ActionBar';
import { Form, FormScreen, FormSection, FormToggle } from 'components/Form';
import { Title } from 'components/Text';
import { toast } from 'components/Toast';
import DeviceInfo from 'constants/DeviceInfo';
import { setSetupSeen, setWhatsNewSeen } from 'data/appState';
import { setSetting, useSettings } from 'data/settings';
import { calendarSettingsTitle } from 'helpers/calendar/details';
import { t } from 'helpers/i18n';
import {
  newContentToggles,
  notificationToggles,
} from 'helpers/notificationToggles';
import {
  useAssignmentSync,
  useCourseScheduleSync,
} from 'hooks/useCalendarSync';
import useNotificationPermission from 'hooks/useNotificationPermission';
import { RootStackParams } from 'navigation/types';

type Props = NativeStackScreenProps<RootStackParams, 'Setup'>;

/**
 * The page after the first login, where people choose what to turn on:
 * notifications of new content (in the tabs' order), class and deadline
 * reminders and grades, all on here to start with, and syncing the timetable
 * and assignments to the calendar and, on Apple platforms, assignments to
 * Reminders, off unless an earlier version synced them.
 * (Settings has them all off until chosen.) Done saves the choices and asks
 * for the permissions they need; notifications chosen stay on if that's
 * denied, and start working once they're allowed. Opened by `useLaunchSheet`,
 * once, also on an update for a user who never saw it.
 */
const Setup: React.FC<Props> = ({ navigation, route }) => {
  const notifications = useSettings(settings => settings.notifications);
  // On after an update if the user synced before.
  const calendarSynced = useSettings(
    settings => settings.assignmentCalendarSync,
  );
  const remindersSynced = useSettings(
    settings => settings.assignmentReminderSync,
  );
  const scheduleSynced = useSettings(settings => settings.courseCalendarSync);
  const { request } = useNotificationPermission();
  const { setSyncEnabled } = useAssignmentSync();
  const { setSyncEnabled: setScheduleSyncEnabled } = useCourseScheduleSync();

  const [choices, setChoices] = useState({
    notices: true,
    assignments: true,
    files: true,
    classReminders: true,
    deadlineReminders: true,
    grades: true,
    schedule: scheduleSynced,
    calendar: calendarSynced,
    reminders: remindersSynced,
  });
  const [saving, setSaving] = useState(false);

  // Seen once shown, however it's closed, and a new user's What's New is
  // this version's. After an update, What's New still shows next launch.
  const update = route.params?.update ?? false;
  useEffect(() => {
    setSetupSeen();
    if (!update) {
      setWhatsNewSeen(DeviceInfo.appVersion());
    }
  }, [update]);

  const choose = (key: keyof typeof choices) => (value: boolean) =>
    setChoices(current => ({ ...current, [key]: value }));

  const toggle = (
    key: Exclude<keyof typeof choices, 'schedule' | 'calendar' | 'reminders'>,
  ) => (
    <FormToggle
      key={key}
      testID={`setup-${key}`}
      icon={notificationToggles[key].icon}
      title={notificationToggles[key].title()}
      value={choices[key]}
      onValueChange={choose(key)}
    />
  );

  const close = () => navigation.goBack();

  const handleDone = async () => {
    setSaving(true);
    const { schedule, calendar, reminders, ...chosen } = choices;
    if (Object.values(chosen).some(Boolean)) {
      // Kept even if the permission is denied, so they start working once
      // notifications are allowed in the system settings.
      setSetting('notifications', {
        ...notifications,
        ...chosen,
        // A new assignment's deadline moving, or its group submitting it,
        // is news about it too.
        deadlineChanges: chosen.assignments,
        groupSubmissions: chosen.assignments,
      });
      if (!(await request())) {
        toast(t('notificationPermissionDenied'), 'error');
      }
    }
    if (schedule && !scheduleSynced) {
      await setScheduleSyncEnabled(true);
    }
    if (calendar && !calendarSynced) {
      await setSyncEnabled('calendar', true);
    }
    if (reminders && !remindersSynced) {
      await setSyncEnabled('reminder', true);
    }
    setSaving(false);
    close();
  };

  return (
    <FormScreen testID="setup">
      <Title
        variant="largeTitle"
        style={styles.title}
        accessibilityRole="header"
      >
        {t('setupTitle')}
      </Title>
      <Form>
        <FormSection title={t('setupNewContent')}>
          {newContentToggles.map(toggle)}
        </FormSection>
        {/* Classes before assignments, as in Settings › Calendar. */}
        <FormSection title={t('schedule')}>
          {toggle('classReminders')}
        </FormSection>
        <FormSection title={t('assignments')}>
          {toggle('deadlineReminders')}
          {toggle('grades')}
        </FormSection>
        {/* Reminders sync is only on iOS, iPadOS and Mac. Classes before
            assignments, as in Settings › Calendar. */}
        <FormSection title={calendarSettingsTitle()} footer={t('setupCaption')}>
          <FormToggle
            icon="calendar"
            title={t('setupCourseCalendar')}
            value={choices.schedule}
            onValueChange={choose('schedule')}
          />
          <FormToggle
            icon="assignmentCalendar"
            title={t('setupCalendar')}
            value={choices.calendar}
            onValueChange={choose('calendar')}
          />
          {Platform.OS === 'ios' && (
            <FormToggle
              icon="reminders"
              title={t('setupReminders')}
              value={choices.reminders}
              onValueChange={choose('reminders')}
            />
          )}
        </FormSection>
      </Form>
      <ActionBar
        action={{
          label: t('done'),
          testID: 'setup-done',
          disabled: saving,
          onPress: handleDone,
        }}
        secondaryAction={{
          label: t('notNow'),
          testID: 'setup-not-now',
          onPress: close,
        }}
      />
    </FormScreen>
  );
};

const styles = StyleSheet.create({
  title: {
    textAlign: Platform.OS === 'android' ? 'auto' : 'center',
    paddingHorizontal: 24,
    paddingTop: 34,
    paddingBottom: 10,
  },
});

export default Setup;
