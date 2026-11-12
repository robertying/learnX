import { Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Form,
  FormButton,
  FormNumberField,
  FormScreen,
  FormSection,
  FormToggle,
} from 'components/Form';
import { toast } from 'components/Toast';
import { setSetting, useSettings } from 'data/settings';
import { NotificationSettings as Settings } from 'data/types/state';
import { t } from 'helpers/i18n';
import {
  newContentToggles,
  notificationToggles,
  type NotificationToggle,
} from 'helpers/notificationToggles';
import { openSystemSettings } from 'helpers/systemSettings';
import useNotificationPermission from 'hooks/useNotificationPermission';
import { SettingsStackParams } from 'navigation/types';

type Props = NativeStackScreenProps<
  SettingsStackParams,
  'NotificationSettings'
>;

// Grades and the assignment changes follow deadline reminders.
const assignmentToggles = [
  'grades',
  'deadlineChanges',
  'groupSubmissions',
] as const satisfies NotificationToggle[];

const NotificationSettings: React.FC<Props> = () => {
  const notifications = useSettings(settings => settings.notifications);
  const { permission, request, exactAlarms, requestExact } =
    useNotificationPermission();
  const showExact =
    (notifications.deadlineReminders || notifications.classReminders) &&
    exactAlarms === false;

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSetting('notifications', { ...notifications, [key]: value });

  /**
   * Turning one on asks for the permission. It stays on even if that's
   * denied: it's the user's choice, and it starts working once notifications
   * are allowed in the system settings.
   */
  const handleToggle = async (key: NotificationToggle, value: boolean) => {
    set(key, value);
    if (value && !(await request())) {
      toast(t('notificationPermissionDenied'), 'error');
    }
  };

  const renderToggle = (key: NotificationToggle) => (
    <FormToggle
      key={key}
      testID={`notifications-${key}`}
      icon={notificationToggles[key].icon}
      title={notificationToggles[key].title()}
      value={notifications[key]}
      onValueChange={value => handleToggle(key, value)}
    />
  );

  const anyOn = (Object.keys(notificationToggles) as NotificationToggle[]).some(
    key => notifications[key],
  );

  /**
   * Something is on that can't show: said first, with a way to fix it. While
   * the system still lets the app ask, the button asks; otherwise it opens
   * the system settings.
   */
  const blocked = permission !== null && permission !== 'granted' && anyOn;

  return (
    <FormScreen>
      <Form>
        {blocked && (
          <FormSection footer={t('notificationsOffCaption')}>
            <FormButton
              testID="notifications-turn-on"
              icon="notificationsOff"
              title={t('turnOnNotifications')}
              onPress={() =>
                permission === 'denied'
                  ? openSystemSettings('notifications')
                  : request()
              }
            />
          </FormSection>
        )}
        <FormSection
          title={t('setupNewContent')}
          footer={t('notificationsCaption')}
        >
          {newContentToggles.map(renderToggle)}
        </FormSection>
        {/* Classes before assignments, as in Settings › Calendar. */}
        <FormSection
          title={t('schedule')}
          footer={t('notifyClassRemindersCaption')}
        >
          {renderToggle('classReminders')}
          {notifications.classReminders && (
            <FormNumberField
              title={t('classReminderOffset')}
              value={notifications.classReminderOffset}
              onValueChange={value => set('classReminderOffset', value)}
            />
          )}
        </FormSection>
        <FormSection
          title={t('assignments')}
          footer={[
            Platform.OS === 'ios'
              ? t('notifyDeadlineRemindersCaption')
              : t('notifyDeadlineRemindersCaptionAndroid'),
            showExact && t('exactRemindersCaption'),
          ]
            .filter(Boolean)
            .join('\n\n')}
        >
          {renderToggle('deadlineReminders')}
          {notifications.deadlineReminders && (
            <FormNumberField
              title={t('deadlineReminderOffset')}
              value={notifications.deadlineReminderOffset}
              onValueChange={value => set('deadlineReminderOffset', value)}
            />
          )}
          {showExact && (
            <FormButton
              icon="reminder"
              title={t('allowExactReminders')}
              onPress={requestExact}
            />
          )}
          {assignmentToggles.map(renderToggle)}
        </FormSection>
        <FormSection footer={t('notificationAccessCaption')}>
          <FormButton
            icon="settings"
            title={t('openSystemSettings')}
            onPress={() => openSystemSettings('notifications')}
          />
        </FormSection>
      </Form>
    </FormScreen>
  );
};

export default NotificationSettings;
