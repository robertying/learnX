import { useEffect, useState } from 'react';
import { Platform, PlatformColor, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import ActionBar from 'components/ActionBar';
import { Form, FormSection, FormToggle } from 'components/Form';
import { Title } from 'components/Text';
import { toast } from 'components/Toast';
import DeviceInfo from 'constants/DeviceInfo';
import { setSetupSeen, setWhatsNewSeen } from 'data/appState';
import { setSetting, useSettings } from 'data/settings';
import { t } from 'helpers/i18n';
import { useAssignmentSync } from 'hooks/useCalendarSync';
import useNotificationPermission from 'hooks/useNotificationPermission';
import { useTheme } from 'theme';
import { RootStackParams } from './types';
import packageJson from '../../package.json';

type Props = NativeStackScreenProps<RootStackParams, 'Setup'>;

/**
 * The page after the first login: turns on notifications of new content (in
 * the tabs' order), class and deadline reminders and grades (all on to start
 * with), and calendar sync and, on Apple platforms, Reminders sync (off). All
 * of them start off in Settings. Done saves the choices and asks for the
 * permissions they need; notifications chosen stay on if that's denied, and
 * start working once they're allowed. Opened by `useLaunchSheet`, once.
 */
const Setup: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const notifications = useSettings(settings => settings.notifications);
  const { request } = useNotificationPermission();
  const { setSyncEnabled } = useAssignmentSync();

  const [choices, setChoices] = useState({
    notices: true,
    assignments: true,
    files: true,
    classReminders: true,
    deadlineReminders: true,
    grades: true,
    calendar: false,
    reminders: false,
  });
  const [saving, setSaving] = useState(false);

  // Seen once shown, however it's closed, and a new user's What's New is
  // this version's.
  useEffect(() => {
    setSetupSeen();
    setWhatsNewSeen(packageJson.version);
  }, []);

  const choose = (key: keyof typeof choices) => (value: boolean) =>
    setChoices(current => ({ ...current, [key]: value }));

  const close = () => navigation.goBack();

  const handleDone = async () => {
    setSaving(true);
    const { calendar, reminders, ...chosen } = choices;
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
    if (calendar) {
      await setSyncEnabled('calendar', true);
    }
    if (reminders) {
      await setSyncEnabled('reminder', true);
    }
    setSaving(false);
    close();
  };

  return (
    <View
      testID="setup"
      style={[
        styles.root,
        {
          backgroundColor:
            Platform.OS === 'android'
              ? theme.colors.surface
              : DeviceInfo.isMac()
                ? PlatformColor('systemBackground')
                : PlatformColor('systemGroupedBackground'),
        },
      ]}
    >
      <Title
        variant="largeTitle"
        style={styles.title}
        accessibilityRole="header"
      >
        {t('setupTitle')}
      </Title>
      <Form>
        <FormSection title={t('setupNewContent')}>
          <FormToggle
            testID="setup-notices"
            icon="notices"
            title={t('notifyNewNotices')}
            value={choices.notices}
            onValueChange={choose('notices')}
          />
          <FormToggle
            icon="assignments"
            title={t('notifyNewAssignments')}
            value={choices.assignments}
            onValueChange={choose('assignments')}
          />
          <FormToggle
            icon="files"
            title={t('notifyNewFiles')}
            value={choices.files}
            onValueChange={choose('files')}
          />
        </FormSection>
        {/* Classes before assignments, as in Settings › Calendar. */}
        <FormSection title={t('schedule')}>
          <FormToggle
            icon="reminder"
            title={t('notifyClassReminders')}
            value={choices.classReminders}
            onValueChange={choose('classReminders')}
          />
        </FormSection>
        <FormSection title={t('assignments')}>
          <FormToggle
            icon="reminder"
            title={t('notifyDeadlineReminders')}
            value={choices.deadlineReminders}
            onValueChange={choose('deadlineReminders')}
          />
          <FormToggle
            icon="grade"
            title={t('notifyGrades')}
            value={choices.grades}
            onValueChange={choose('grades')}
          />
        </FormSection>
        {/* Reminders sync is only on iOS, iPadOS and Mac (Settings ›
            Calendars & Reminders). */}
        <FormSection
          title={
            Platform.OS === 'ios'
              ? t('calendarsAndReminders')
              : t('setupCalendarSection')
          }
          footer={t('setupCaption')}
        >
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
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  title: {
    textAlign: Platform.OS === 'android' ? 'auto' : 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 8,
  },
});

export default Setup;
