import {Platform} from 'react-native';
import Info from 'react-native-device-info';

let _isIPad: boolean;
let _buildNo: string;

const init = async () => {
  _isIPad = (await Info.isTablet()) && Platform.OS === 'ios';
  _buildNo = await Info.getBuildNumber();
};

const isIPad = () => _isIPad;

export default {
  init,
  buildNo: () => _buildNo,
};
