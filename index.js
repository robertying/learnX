import './polyfills';

import {AppRegistry, LogBox, Platform, UIManager} from 'react-native';
import {name as appName} from './app.json';
import App from './src/App';

LogBox.ignoreAllLogs(true);

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

AppRegistry.registerComponent(appName, () => App);
