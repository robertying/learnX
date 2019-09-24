import {Platform} from 'react-native';
import Info from 'react-native-device-info';

let _isIPad: boolean;
let _isIPad12_9: boolean;
let _buildNo: string;

const init = async () => {
  _isIPad = (await Info.isTablet()) && Platform.OS === 'ios';
  _isIPad12_9 = (await Info.getDeviceName()).includes('iPad Pro (12.9-inch)');
  _buildNo = await Info.getBuildNumber();
};

export default {
  init,
  isIPad: () => _isIPad,
  isIPad12_9: () => _isIPad12_9,
  buildNo: () => _buildNo,
};
