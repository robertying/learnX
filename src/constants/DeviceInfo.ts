import {Platform} from 'react-native';
import Info from 'react-native-device-info';

let _isIPad: boolean;

const init = async () => {
  _isIPad = (await Info.isTablet()) && Platform.OS === 'ios';
};

const isIPad = () => _isIPad;

export default {
  init,
  isIPad,
};
