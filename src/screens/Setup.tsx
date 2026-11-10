import { useEffect, useState } from 'react';
import { Platform, PlatformColor, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ContainedButton from 'components/ContainedButton';
import { Form, FormSection, FormToggle } from 'components/Form';
import { Title } from 'components/Text';
import TextButton from 'components/TextButton';
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
 * The page after the first login: turns on notifications and deadline
 * reminders (on to start with) and calendar sync (off), all of which start
 * off in Settings, and asks for the permissions they need on Done. Opened by
 * `useLaunchSheet`, once.
 */
const Setup: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const notifications = useSettings(settings => settings.notifications);
  const { request } = useNotificationPermission();
  const { setSyncEnabled } = useAssignmentSync();

  const [choices, setChoices] = useState({
    notices: true,
    files: true,
    assignments: true,
    deadlineReminders: true,
    calendar: false,
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
    const { calendar, assignments, ...rest } = choices;
    if (assignments || Object.values(rest).some(Boolean)) {
      if (await request()) {
        setSetting('notifications', {
          ...notifications,
          ...rest,
          assignments,
          grades: assignments,
          deadlineChanges: assignments,
        });
      } else {
        toast(t('notificationPermissionDenied'), 'error');
      }
    }
    if (calendar) {
      await setSyncEnabled('calendar', true);
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
        <FormSection title={t('notifications')}>
          <FormToggle
            testID="setup-notices"
            icon={{ ios: 'bell', android: 'bell' }}
            title={t('notifyNewNotices')}
            value={choices.notices}
            onValueChange={choose('notices')}
          />
          <FormToggle
            icon={{ ios: 'folder', android: 'folder' }}
            title={t('notifyNewFiles')}
            value={choices.files}
            onValueChange={choose('files')}
          />
          <FormToggle
            icon={{ ios: 'checkmark.seal', android: 'clipboard-check-outline' }}
            title={t('setupAssignments')}
            value={choices.assignments}
            onValueChange={choose('assignments')}
          />
          <FormToggle
            icon={{ ios: 'alarm', android: 'alarm' }}
            title={t('notifyDeadlineReminders')}
            value={choices.deadlineReminders}
            onValueChange={choose('deadlineReminders')}
          />
        </FormSection>
        <FormSection footer={t('setupCaption')}>
          <FormToggle
            icon={{ ios: 'calendar', android: 'calendar-range' }}
            title={t('setupCalendar')}
            value={choices.calendar}
            onValueChange={choose('calendar')}
          />
        </FormSection>
      </Form>
      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 16) + 8 },
          Platform.OS === 'android' && styles.androidFooter,
        ]}
      >
        {Platform.OS === 'android' ? (
          <>
            <TextButton testID="setup-not-now" onPress={close}>
              {t('notNow')}
            </TextButton>
            <ContainedButton
              testID="setup-done"
              label={t('done')}
              disabled={saving}
              onPress={handleDone}
            />
          </>
        ) : (
          <>
            <ContainedButton
              testID="setup-done"
              label={t('done')}
              disabled={saving}
              onPress={handleDone}
            />
            <TextButton testID="setup-not-now" onPress={close}>
              {t('notNow')}
            </TextButton>
          </>
        )}
      </View>
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
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: 'center',
    gap: 8,
  },
  androidFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});

export default Setup;
