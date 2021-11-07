import Info from 'react-native-device-info';

export default {
  buildNo: () => Info.getBuildNumber(),
  isTablet: () => Info.isTablet(),
  isMac: () =>
    (Info.getSystemName() === 'iPhone OS' ||
      Info.getSystemName() === 'iOS' ||
      Info.getSystemName() === 'iPadOS' ||
      Info.getSystemName() === 'Mac OS X') &&
    Info.getDeviceType() === 'Desktop',
  abi: async () => (await Info.supportedAbis())?.[0] || 'universal',
};
