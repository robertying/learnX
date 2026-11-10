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

// iOS 26 and later: Liquid Glass, native header subtitles
const ios26 =
  Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26;

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
  /** iOS 26 and later, which draw controls in Liquid Glass. */
  hasLiquidGlass: () => ios26,
  supportsNativeSubtitle: () => ios26,
  // On a Mac, expo-device names the CPU ("arm64" reads as "Simulator iOS").
  model: () => (isMac ? 'Mac' : modelName || osName || Platform.OS),
};
