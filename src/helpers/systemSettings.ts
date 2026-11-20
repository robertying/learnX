import { Linking } from 'react-native';
import { applicationId } from 'expo-application';
import DeviceInfo from 'constants/DeviceInfo';
import { isAndroid, isApple } from 'helpers/platform';

type SettingsPage = 'notifications' | 'security';

const openPage = async (page: SettingsPage) => {
  if (DeviceInfo.isMac()) {
    return Linking.openURL(
      `x-apple.systempreferences:com.apple.preference.${page}`,
    );
  }
  if (isApple() && page === 'notifications') {
    try {
      // UIApplicationOpenNotificationSettingsURLString (iOS 16+).
      return await Linking.openURL('app-settings:notifications');
    } catch {
      // Not opened: the app's page instead.
    }
  }
  if (isAndroid() && page === 'notifications' && applicationId) {
    try {
      return await Linking.sendIntent(
        'android.settings.APP_NOTIFICATION_SETTINGS',
        [{ key: 'android.provider.extra.APP_PACKAGE', value: applicationId }],
      );
    } catch {
      // Not offered by this device: its app page instead.
    }
  }
  return Linking.openSettings();
};

/**
 * Opens the app's page in the system's settings; on Mac, which has no such
 * page, the System Settings pane for the permission instead. On iOS and
 * Android, notifications open the app's notification page, where the
 * toggles are. One that can't open does nothing, as `openLink`, rather than
 * leave an unhandled rejection.
 */
export const openSystemSettings = (page: SettingsPage): Promise<void> =>
  openPage(page).then(
    () => {},
    () => {},
  );
