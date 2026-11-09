import { Linking } from 'react-native';
import DeviceInfo from 'constants/DeviceInfo';

/**
 * Opens the app's page in the system's settings; on Mac, which has no such
 * page, the System Settings pane for the permission instead.
 */
export const openSystemSettings = (macPane: 'notifications' | 'security') =>
  DeviceInfo.isMac()
    ? Linking.openURL(
        `x-apple.systempreferences:com.apple.preference.${macPane}`,
      )
    : Linking.openSettings();
