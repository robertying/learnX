import { Platform } from 'react-native';
import Info from 'react-native-device-info';

const cached: {
  buildNo: string;
  isTablet: boolean;
  isIPad: boolean;
  isMac: boolean;
  abi: string | null;
  systemVersion: string;
  supportsNativeSubtitle: boolean;
  isEmulator: boolean | null;
  isWSA: boolean;
  model: string;
} = {
  buildNo: Info.getBuildNumber(),
  isTablet: Info.isTablet(),
  isIPad: Info.getSystemName() === 'iPadOS',
  isMac:
    (Info.getSystemName() === 'iPhone OS' ||
      Info.getSystemName() === 'iOS' ||
      Info.getSystemName() === 'iPadOS' ||
      Info.getSystemName() === 'Mac OS X') &&
    Info.getDeviceType() === 'Desktop',
  abi: null,
  systemVersion: Info.getSystemVersion(),
  supportsNativeSubtitle:
    Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26,
  isEmulator: null,
  isWSA: Info.getModel() === 'Subsystem for Android(TM)',
  model: Info.getModel(),
};

export default {
  buildNo: () => cached.buildNo,
  isTablet: () => cached.isTablet,
  isIPad: () => cached.isIPad,
  isMac: () => cached.isMac,
  abi: async () => {
    if (cached.abi !== null) {
      return cached.abi;
    }
    cached.abi = (await Info.supportedAbis())?.[0] || 'universal';
    return cached.abi;
  },
  systemVersion: () => cached.systemVersion,
  supportsNativeSubtitle: () => cached.supportsNativeSubtitle,
  isEmulator: async () => {
    if (cached.isEmulator !== null) {
      return cached.isEmulator;
    }
    cached.isEmulator = await Info.isEmulator();
    return cached.isEmulator;
  },
  isWSA: () => cached.isWSA,
  model: () => {
    if (cached.model === 'unknown') {
      return cached.isMac ? 'Mac' : Info.getSystemName();
    }
    return cached.model;
  },
};
