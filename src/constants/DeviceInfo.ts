import {Platform} from 'react-native';
import Info from 'react-native-device-info';

let _isIPad: boolean;
let _isIPad12_9: boolean;
let _buildNo: string;
let _abi: string;

const init = async () => {
  _isIPad = Info.isTablet() && Platform.OS === 'ios';
  _isIPad12_9 = (await Info.getDeviceName()).includes('iPad Pro (12.9-inch)');
  _buildNo = Info.getBuildNumber();
  const abis = await Info.supportedAbis();
  _abi = abis[0] || 'universal';
};

export default {
  init,
  isIPad: () => _isIPad,
  isIPad12_9: () => _isIPad12_9,
  buildNo: () => _buildNo,
  isMac: () => Info.getSystemName() === 'Mac OS X',
  abi: () => _abi,
};
