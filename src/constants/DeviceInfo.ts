import Info from 'react-native-device-info';

const cached: {
  buildNo: string;
  isTablet: boolean;
  isMac: boolean;
  abi: string | null;
  systemVersion: string;
  isEmulator: boolean | null;
  isWSA: boolean;
  model: string;
} = {
  buildNo: Info.getBuildNumber(),
  isTablet: Info.isTablet(),
  isMac:
    (Info.getSystemName() === 'iPhone OS' ||
      Info.getSystemName() === 'iOS' ||
      Info.getSystemName() === 'iPadOS' ||
      Info.getSystemName() === 'Mac OS X') &&
    Info.getDeviceType() === 'Desktop',
  abi: null,
  systemVersion: Info.getSystemVersion(),
  isEmulator: null,
  isWSA: Info.getModel() === 'Subsystem for Android(TM)',
  model: Info.getModel(),
};

export default {
  buildNo: () => cached.buildNo,
  isTablet: () => cached.isTablet,
  isMac: () => cached.isMac,
  abi: async () => {
    if (cached.abi !== null) {
      return cached.abi;
    }
    cached.abi = (await Info.supportedAbis())?.[0] || 'universal';
    return cached.abi;
  },
  systemVersion: () => cached.systemVersion,
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
