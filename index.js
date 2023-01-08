import 'react-native-url-polyfill/auto';
import {AppRegistry, Platform, UIManager} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';
import './src/helpers/background';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

AppRegistry.registerComponent(appName, () => App);
