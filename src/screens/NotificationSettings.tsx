import { Linking } from 'react-native';
import dayjs from 'dayjs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Form,
  FormButton,
  FormIcon,
  FormNumberField,
  FormSection,
  FormToggle,
} from 'components/Form';
import SafeArea from 'components/SafeArea';
import { toast } from 'components/Toast';
import DeviceInfo from 'constants/DeviceInfo';
import {
  assignmentsQuery,
  filesQuery,
  noticesQuery,
  useNotices,
} from 'data/content';
import { queryClient } from 'data/queryClient';
import { getUserData } from 'data/userData';
import { notifyContent, syncContent } from 'helpers/background';
import { previewDeadlineReminder } from 'helpers/deadlineReminders';
import { setSetting, useSettings } from 'data/settings';
import { NotificationSettings as Settings } from 'data/types/state';
import { t } from 'helpers/i18n';
import { postNotification } from 'helpers/notifications';
import useNotificationPermission from 'hooks/useNotificationPermission';
import { SettingsStackParams } from './types';

type Props = NativeStackScreenProps<
  SettingsStackParams,
  'NotificationSettings'
>;

type Toggle = Exclude<keyof Settings, 'deadlineReminderOffset'>;

const contentToggles: {
  key: Toggle;
  icon: FormIcon;
  label: string;
}[] = [
  {
    key: 'notices',
    icon: { ios: 'bell', android: 'bell', color: 'red' },
    label: t('notifyNewNotices'),
  },
  {
    key: 'files',
    icon: { ios: 'folder', android: 'folder', color: 'blue' },
    label: t('notifyNewFiles'),
  },
  {
    key: 'assignments',
    icon: { ios: 'calendar', android: 'calendar', color: 'red' },
    label: t('notifyNewAssignments'),
  },
  {
    key: 'grades',
    icon: {
      ios: 'checkmark.seal',
      android: 'clipboard-check-outline',
      color: 'green',
    },
    label: t('notifyGrades'),
  },
  {
    key: 'deadlineChanges',
    icon: { ios: 'clock.arrow.circlepath', android: 'update', color: 'indigo' },
    label: t('notifyDeadlineChanges'),
  },
];

const openSystemSettings = () =>
  DeviceInfo.isMac()
    ? Linking.openURL(
        'x-apple.systempreferences:com.apple.preference.notifications',
      )
    : Linking.openSettings();

/**
 * Debug builds: forgets a few items and grades, then syncs as the background
 * task does, so what comes back is posted as new.
 */
const simulateNewContent = async () => {
  const semesterId = getUserData().currentSemester;
  if (!semesterId) {
    return;
  }
  queryClient.setQueryData(noticesQuery(semesterId).queryKey, old =>
    old?.slice(3),
  );
  queryClient.setQueryData(filesQuery(semesterId).queryKey, old =>
    old?.slice(3),
  );
  queryClient.setQueryData(assignmentsQuery(semesterId).queryKey, old =>
    old
      ?.filter(a => a.submitted || dayjs(a.deadline).isBefore(dayjs()))
      .map(a => (a.graded ? { ...a, graded: false } : a)),
  );
  const result = await syncContent();
  if (result.status !== 'synced') {
    toast(result.status, 'error');
    return;
  }
  const posted = await notifyContent(result.diff, { inForeground: true });
  toast(String(posted.length), 'success');
};

const NotificationSettings: React.FC<Props> = () => {
  const notifications = useSettings(settings => settings.notifications);
  const { permission, request } = useNotificationPermission();
  const { notices } = useNotices();

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSetting('notifications', { ...notifications, [key]: value });

  /** Turning one on asks for the permission first. */
  const handleToggle = async (key: Toggle, value: boolean) => {
    if (value && !(await request())) {
      toast(t('notificationPermissionDenied'), 'error');
      return;
    }
    set(key, value);
  };

  const anyOn = (Object.keys(notifications) as (keyof Settings)[]).some(
    key => key !== 'deadlineReminderOffset' && notifications[key],
  );

  const sendTestNotification = async () => {
    if (!(await request())) {
      toast(t('notificationPermissionDenied'), 'error');
      return;
    }
    const notice = notices[0];
    await postNotification({
      title: notice?.courseName ?? 'learnX',
      body: notice?.title ?? t('notifications'),
      target: { type: 'notice', id: notice?.id },
    });
  };

  const handleSimulateNewContent = async () => {
    if (!(await request())) {
      toast(t('notificationPermissionDenied'), 'error');
      return;
    }
    await simulateNewContent();
  };

  return (
    <SafeArea>
      <Form>
        <FormSection footer={t('notificationsCaption')}>
          {contentToggles.map(({ key, icon, label }) => (
            <FormToggle
              key={key}
              testID={`notifications-${key}`}
              icon={icon}
              title={label}
              value={notifications[key]}
              onValueChange={value => handleToggle(key, value)}
            />
          ))}
        </FormSection>
        <FormSection
          footer={
            permission === 'denied' && anyOn
              ? `${t('notifyDeadlineRemindersCaption')}\n\n${t('notificationPermissionDenied')}`
              : t('notifyDeadlineRemindersCaption')
          }
        >
          <FormToggle
            testID="notifications-deadlineReminders"
            icon={{ ios: 'alarm', android: 'alarm', color: 'orange' }}
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
        </FormSection>
        <FormSection>
          <FormButton
            icon={{ ios: 'gear', android: 'cog', color: 'gray' }}
            title={t('configureNotifications')}
            onPress={openSystemSettings}
          />
          {__DEV__ && (
            <FormButton
              icon={{ ios: 'paperplane', android: 'send', color: 'blue' }}
              title={t('sendTestNotification')}
              onPress={sendTestNotification}
            />
          )}
          {__DEV__ && (
            <FormButton
              icon={{
                ios: 'arrow.triangle.2.circlepath',
                android: 'sync',
                color: 'blue',
              }}
              title={t('simulateNewContent')}
              onPress={handleSimulateNewContent}
            />
          )}
          {__DEV__ && (
            <FormButton
              icon={{ ios: 'alarm', android: 'alarm-check', color: 'orange' }}
              title={t('previewDeadlineReminder')}
              onPress={async () =>
                toast(String(await previewDeadlineReminder()), 'success')
              }
            />
          )}
        </FormSection>
      </Form>
    </SafeArea>
  );
};

export default NotificationSettings;
