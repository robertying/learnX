import Constants from 'expo-constants';
import {Dimensions} from 'react-native';

export default {
  initialWindow: Dimensions.get('window'),
  normalBlockHeight: 44,
  statusBarHeight: Constants.statusBarHeight,
};
