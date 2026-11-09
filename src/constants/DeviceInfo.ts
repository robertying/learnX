import { Platform } from 'react-native';
import { nativeBuildVersion } from 'expo-application';
import {
  DeviceType,
  deviceType,
  modelName,
  osName,
  osVersion,
  supportedCpuArchitectures,
} from 'expo-device';

// Mac Catalyst, and the iPad app on Apple silicon Macs
const isMac = Platform.OS === 'ios' && deviceType === DeviceType.DESKTOP;

export default {
  buildNo: () => nativeBuildVersion ?? '',
  isTablet: () => deviceType === DeviceType.TABLET,
  isIPad: () => osName === 'iPadOS',
  isMac: () => isMac,
  /** The APK flavor to download on Android. */
  abi: () => supportedCpuArchitectures?.[0] || 'universal',
  systemVersion: () => osVersion ?? '',
  supportsNativeSubtitle: () =>
    Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26,
  // On a Mac, expo-device names the CPU ("arm64" reads as "Simulator iOS").
  model: () => (isMac ? 'Mac' : modelName || osName || Platform.OS),
};
