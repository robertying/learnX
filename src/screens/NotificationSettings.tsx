import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Form,
  FormButton,
  FormIcon,
  FormNumberField,
  FormScreen,
  FormSection,
  FormToggle,
} from 'components/Form';
import { toast } from 'components/Toast';
import { setSetting, useSettings } from 'data/settings';
import { NotificationSettings as Settings } from 'data/types/state';
import { t } from 'helpers/i18n';
import { openSystemSettings } from 'helpers/systemSettings';
import useNotificationPermission from 'hooks/useNotificationPermission';
import { SettingsStackParams } from './types';

type Props = NativeStackScreenProps<
  SettingsStackParams,
  'NotificationSettings'
>;

type Offset = 'deadlineReminderOffset' | 'classReminderOffset';
type Toggle = Exclude<keyof Settings, Offset>;

interface ToggleRow {
  key: Toggle;
  icon: FormIcon;
  label: string;
}

// Grouped and ordered as on the Setup page.
const contentToggles: ToggleRow[] = [
  {
    key: 'notices',
    icon: 'notices',
    label: t('notifyNewNotices'),
  },
  {
    key: 'assignments',
    icon: 'assignments',
    label: t('notifyNewAssignments'),
  },
  {
    key: 'files',
    icon: 'files',
    label: t('notifyNewFiles'),
  },
];

const assignmentToggles: ToggleRow[] = [
  {
    key: 'grades',
    icon: 'grade',
    label: t('notifyGrades'),
  },
  {
    key: 'deadlineChanges',
    icon: 'deadlineChange',
    label: t('notifyDeadlineChanges'),
  },
  {
    key: 'groupSubmissions',
    icon: 'groupSubmission',
    label: t('notifyGroupSubmissions'),
  },
];

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
  const handleToggle = async (key: Toggle, value: boolean) => {
    set(key, value);
    if (value && !(await request())) {
      toast(t('notificationPermissionDenied'), 'error');
    }
  };

  const renderToggle = ({ key, icon, label }: ToggleRow) => (
    <FormToggle
      key={key}
      testID={`notifications-${key}`}
      icon={icon}
      title={label}
      value={notifications[key]}
      onValueChange={value => handleToggle(key, value)}
    />
  );

  const anyOn = (Object.keys(notifications) as (keyof Settings)[]).some(
    key =>
      key !== 'deadlineReminderOffset' &&
      key !== 'classReminderOffset' &&
      notifications[key],
  );

  return (
    <FormScreen>
      <Form>
        <FormSection
          title={t('setupNewContent')}
          footer={t('notificationsCaption')}
        >
          {contentToggles.map(renderToggle)}
        </FormSection>
        {/* Classes before assignments, as in Settings › Calendar. */}
        <FormSection
          title={t('schedule')}
          footer={t('notifyClassRemindersCaption')}
        >
          <FormToggle
            testID="notifications-classReminders"
            icon="classReminder"
            title={t('notifyClassReminders')}
            value={notifications.classReminders}
            onValueChange={value => handleToggle('classReminders', value)}
          />
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
            t('notifyDeadlineRemindersCaption'),
            showExact && t('exactRemindersCaption'),
            permission !== null &&
              permission !== 'granted' &&
              anyOn &&
              t('notificationPermissionDenied'),
          ]
            .filter(Boolean)
            .join('\n\n')}
        >
          <FormToggle
            testID="notifications-deadlineReminders"
            icon="reminder"
            title={t('notifyDeadlineReminders')}
            value={notifications.deadlineReminders}
            onValueChange={value => handleToggle('deadlineReminders', value)}
          />
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
