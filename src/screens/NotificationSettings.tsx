import { KeyboardAvoidingView, Linking, StyleSheet } from 'react-native';
import { MaterialIconsIconName } from '@react-native-vector-icons/material-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import TableCell from 'components/TableCell';
import SafeArea from 'components/SafeArea';
import ScrollView from 'components/ScrollView';
import { Caption } from 'components/Text';
import { toast } from 'components/Toast';
import Styles from 'constants/Styles';
import DeviceInfo from 'constants/DeviceInfo';
import { useNotices } from 'data/content';
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
  icon: MaterialIconsIconName;
  label: string;
}[] = [
  { key: 'notices', icon: 'notifications', label: t('notifyNewNotices') },
  { key: 'files', icon: 'folder', label: t('notifyNewFiles') },
  { key: 'assignments', icon: 'event', label: t('notifyNewAssignments') },
  { key: 'grades', icon: 'grading', label: t('notifyGrades') },
  {
    key: 'deadlineChanges',
    icon: 'update',
    label: t('notifyDeadlineChanges'),
  },
];

const openSystemSettings = () =>
  DeviceInfo.isMac()
    ? Linking.openURL(
        'x-apple.systempreferences:com.apple.preference.notifications',
      )
    : Linking.openSettings();

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

  return (
    <SafeArea>
      <KeyboardAvoidingView
        style={Styles.flex1}
        behavior="padding"
        keyboardVerticalOffset={120}
      >
        <ScrollView contentContainerStyle={styles.scrollViewPaddings}>
          {contentToggles.map(({ key, icon, label }) => (
            <TableCell
              key={key}
              testID={`notifications-${key}`}
              iconName={icon}
              primaryText={label}
              switchValue={notifications[key]}
              onSwitchValueChange={value => handleToggle(key, value)}
              type="switch"
            />
          ))}
          <Caption style={styles.caption}>{t('notificationsCaption')}</Caption>
          <TableCell
            style={styles.marginTop}
            testID="notifications-deadlineReminders"
            iconName="alarm"
            primaryText={t('notifyDeadlineReminders')}
            switchValue={notifications.deadlineReminders}
            onSwitchValueChange={value =>
              handleToggle('deadlineReminders', value)
            }
            type="switch"
          />
          {notifications.deadlineReminders && (
            <TableCell
              primaryText={t('deadlineReminderOffset')}
              inputValue={notifications.deadlineReminderOffset.toString()}
              onInputValueChange={v => {
                const value = parseInt(v, 10);
                if (value) {
                  set('deadlineReminderOffset', value);
                }
              }}
              type="input"
            />
          )}
          <Caption style={styles.caption}>
            {t('notifyDeadlineRemindersCaption')}
          </Caption>
          {permission === 'denied' && anyOn && (
            <Caption style={styles.caption}>
              {t('notificationPermissionDenied')}
            </Caption>
          )}
          <TableCell
            style={styles.marginTop}
            iconName="settings"
            primaryText={t('configureNotifications')}
            type="none"
            onPress={openSystemSettings}
          />
          {__DEV__ && (
            <TableCell
              iconName="send"
              primaryText={t('sendTestNotification')}
              type="none"
              onPress={async () => {
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
              }}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  marginTop: {
    marginTop: 32,
  },
  scrollViewPaddings: {
    paddingVertical: 32,
  },
  caption: {
    marginTop: 8,
    marginHorizontal: 16,
  },
});

export default NotificationSettings;
