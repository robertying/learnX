import { Linking, Platform } from 'react-native';
import { applicationId } from 'expo-application';
import DeviceInfo from 'constants/DeviceInfo';

/**
 * Opens the app's page in the system's settings; on Mac, which has no such
 * page, the System Settings pane for the permission instead. On Android,
 * notifications open the app's notification page, where the toggles are.
 */
export const openSystemSettings = async (
  page: 'notifications' | 'security',
) => {
  if (DeviceInfo.isMac()) {
    return Linking.openURL(
      `x-apple.systempreferences:com.apple.preference.${page}`,
    );
  }
  if (Platform.OS === 'android' && page === 'notifications' && applicationId) {
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
